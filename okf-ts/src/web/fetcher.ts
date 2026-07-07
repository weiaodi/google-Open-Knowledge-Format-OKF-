/**
 * web/fetcher.ts — HTTP 页面抓取器
 *
 * 对应 Python 版 web/fetcher.py。
 * 使用 Node.js 内置的 http/https 模块（兼容 Node 16+，不需要全局 fetch）。
 *
 * 职责：
 *   1. 抓取 HTML 页面（支持重定向）
 *   2. 用 turndown 把 HTML 转换为 Markdown（截断到 40KB）
 *   3. 提取页面内所有绝对 URL（过滤 anchor/非 http(s) 协议）
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import TurndownService from "turndown";

const USER_AGENT =
  "okf-reference-agent/0.1 (+https://github.com/weiaodi/google-Open-Knowledge-Format-OKF-)";
const MAX_MARKDOWN_BYTES = 40 * 1024; // 40KB
const MAX_REDIRECTS = 5;

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface Page {
  url: string;
  title: string | null;
  markdown: string;
  links: string[];
}

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchError";
  }
}

// ── 内部工具函数 ─────────────────────────────────────────────────────────────

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, " ").trim();
  return raw || null;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"'#\s]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href) continue;
    try {
      const abs = new URL(href, baseUrl);
      if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
      abs.hash = "";
      const absStr = abs.toString();
      if (seen.has(absStr)) continue;
      seen.add(absStr);
      out.push(absStr);
    } catch {
      // 无效 URL，跳过
    }
  }
  return out;
}

function truncate(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= maxBytes) return text;
  return buf.slice(0, maxBytes).toString("utf-8") + "\n\n[...truncated...]";
}

/** 用 Node.js http/https 模块抓取 URL，支持重定向，返回 {finalUrl, body, contentType} */
function httpGet(
  urlStr: string,
  timeoutMs: number,
  redirectCount = 0
): Promise<{ finalUrl: string; body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new FetchError("Too many redirects"));
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return reject(new FetchError(`Invalid URL: ${urlStr}`));
    }

    const mod = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,*/*;q=0.5",
      },
    };

    const req = mod.request(options, (res) => {
      // 处理重定向
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        res.resume(); // 消费掉响应体
        const location = new URL(res.headers.location, urlStr).toString();
        resolve(httpGet(location, timeoutMs, redirectCount + 1));
        return;
      }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new FetchError(`HTTP ${res.statusCode} ${res.statusMessage}`));
        return;
      }

      const contentType = res.headers["content-type"] ?? "";
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const bodyBuf = Buffer.concat(chunks);
        // 检测编码
        let charset = "utf-8";
        const ctLower = contentType.toLowerCase();
        if (ctLower.includes("charset=")) {
          const parts = ctLower.split("charset=");
          charset = (parts[1]?.split(";")[0]?.trim()) || "utf-8";
        }
        let body: string;
        try {
          body = bodyBuf.toString(charset as BufferEncoding);
        } catch {
          body = bodyBuf.toString("utf-8");
        }
        resolve({ finalUrl: urlStr, body, contentType });
      });
      res.on("error", (e) => reject(new FetchError(`Response error: ${e.message}`)));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new FetchError(`Timeout after ${timeoutMs}ms`));
    });

    req.on("error", (e) => reject(new FetchError(`Request error: ${e.message}`)));
    req.end();
  });
}

// ── 主函数 ────────────────────────────────────────────────────────────────────

/**
 * 抓取一个 URL，返回 Markdown 内容 + 页面内链接列表。
 * 非 HTML 内容或网络错误会抛出 FetchError。
 */
export async function fetchAndParse(url: string, timeoutMs = 10_000): Promise<Page> {
  const { finalUrl, body: html, contentType } = await httpGet(url, timeoutMs);

  if (!contentType.toLowerCase().includes("html")) {
    throw new FetchError(`Non-HTML content-type: ${contentType || "unknown"}`);
  }

  const title = extractTitle(html);
  const links = extractLinks(html, finalUrl);

  let markdown: string;
  try {
    markdown = td.turndown(html);
  } catch {
    markdown = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  markdown = truncate(markdown, MAX_MARKDOWN_BYTES);

  return { url: finalUrl, title, markdown, links };
}
