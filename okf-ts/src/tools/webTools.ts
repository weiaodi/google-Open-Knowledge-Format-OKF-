/**
 * tools/webTools.ts — Web Pass 网页抓取工具（供 LLM 调用）
 *
 * 对应 Python 版 tools/web_tools.py。
 *
 * fetch_url：抓取一个网页，返回 Markdown 内容 + 外链列表。
 *
 * 安全机制（与 Python 版对齐）：
 *   - allowed_hosts 白名单（空 = seed 域名）
 *   - allowed_path_prefixes 路径前缀过滤
 *   - denied_path_substrings 路径黑名单
 *   - visited 去重（同一 session 不重复抓）
 *   - max_pages 预算（超出直接拒绝）
 *   - max_depth 从 seed 出发的最大跳数
 *   - 只允许通过 links 发现的 URL（防止 LLM 凭空造 URL）
 */

import { getWebState } from "../context.js";
import { fetchAndParse, FetchError } from "../web/fetcher.js";
import type { ToolDef } from "../llmRunner.js";

export const fetchUrlTool: ToolDef = {
  name: "fetch_url",
  description:
    "Fetch a single web page and return its content as markdown plus its outbound links. " +
    "A session-wide crawl budget (max_pages), allowed-hosts filter, optional URL path-prefix " +
    "allow-list, denied-substring blocklist, and a hop-depth cap measured from the seed URLs " +
    "are all enforced. When a fetch is rejected the return value contains an `error` field. " +
    "Treat that as a signal to stop or pick a different URL; do not retry the same URL. " +
    "Successful shape: {url, title, markdown, links, fetched_count, max_pages_budget, depth, max_depth}. " +
    "Rejected shape: {error, url, fetched_count, max_pages_budget}.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The full URL to fetch (must be http or https).",
      },
    },
    required: ["url"],
  },
  fn: async ({ url: rawUrl }) => {
    const url = rawUrl as string;
    const state = getWebState();

    function reject(reason: string) {
      return {
        error: reason,
        url,
        fetched_count: state.fetchedCount,
        max_pages_budget: state.maxPages,
      };
    }

    // ── 协议检查 ───────────────────────────────────────────────────────────
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return reject(`Invalid URL: ${url}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return reject(`Unsupported scheme: ${parsed.protocol}`);
    }

    // ── 主机白名单 ──────────────────────────────────────────────────────────
    if (state.allowedHosts.size > 0 && !state.allowedHosts.has(parsed.hostname)) {
      return reject(
        `Host not in allowed list: ${parsed.hostname} (allowed: ${[...state.allowedHosts].sort().join(", ")})`
      );
    }

    // ── 路径前缀白名单 ──────────────────────────────────────────────────────
    const urlPath = parsed.pathname || "/";
    if (
      state.allowedPathPrefixes.length > 0 &&
      !state.allowedPathPrefixes.some((p) => urlPath.startsWith(p))
    ) {
      return reject(
        `Path not in allowed prefixes: ${urlPath} (allowed: ${state.allowedPathPrefixes.join(", ")})`
      );
    }

    // ── 路径黑名单 ──────────────────────────────────────────────────────────
    for (const bad of state.deniedPathSubstrings) {
      if (bad && urlPath.includes(bad)) {
        return reject(`Path matches denied substring: "${bad}"`);
      }
    }

    // ── 去重检查 ───────────────────────────────────────────────────────────
    if (state.visited.has(url)) {
      return reject("Already fetched in this session");
    }

    // ── 预算检查 ───────────────────────────────────────────────────────────
    if (state.fetchedCount >= state.maxPages) {
      return reject("max_pages budget reached");
    }

    // ── 深度检查 ───────────────────────────────────────────────────────────
    const depth = state.urlDepth.get(url);
    if (depth === undefined) {
      // URL 不在爬虫图里（LLM 凭空造的），拒绝
      return reject(
        "URL not reachable from a seed within the crawl graph " +
        "(was not returned as a link by any fetched page)"
      );
    }
    if (depth > state.maxDepth) {
      return reject(`Depth ${depth} exceeds max_depth ${state.maxDepth}`);
    }

    // ── 实际抓取 ───────────────────────────────────────────────────────────
    state.visited.add(url);
    state.fetchedCount++;

    let page;
    try {
      page = await fetchAndParse(url);
    } catch (e) {
      // 抓取失败：计数已增，不退还（避免无限重试同一 URL）
      return reject(`Fetch failed: ${e instanceof FetchError ? e.message : String(e)}`);
    }

    // 把发现的子链接注册进爬虫图（深度 = 当前深度 + 1）
    const childDepth = depth + 1;
    for (const link of page.links) {
      if (!state.urlDepth.has(link)) {
        state.urlDepth.set(link, childDepth);
      }
    }

    return {
      url: page.url,
      title: page.title,
      markdown: page.markdown,
      links: page.links,
      fetched_count: state.fetchedCount,
      max_pages_budget: state.maxPages,
      depth,
      max_depth: state.maxDepth,
    };
  },
};
