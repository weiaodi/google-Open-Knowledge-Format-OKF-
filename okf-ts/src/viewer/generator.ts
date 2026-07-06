/**
 * viewer/generator.ts — viz.html 知识图谱生成器
 *
 * 升级版功能：
 *   1. 点击节点 → 右侧面板展开该概念的完整 Markdown 文档（rendered HTML）
 *   2. 边去重 + 只保留单向边，避免双向箭头造成视觉混乱
 *   3. 使用 breadthfirst 层级布局，链接关系更清晰
 *
 * 前置产物：已生成的 .md 文件集合
 * 后置产物：bundleRoot/viz.html（可在浏览器直接打开）
 */

import fs from "node:fs";
import path from "node:path";
import { parseOKF } from "../bundle/document.js";
import { pathToConceptId } from "../bundle/paths.js";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  description: string;
  /** 文档的完整 Markdown 正文（用于侧边栏展示） */
  body: string;
  /** frontmatter 中的 resource URL */
  resource: string;
  /** frontmatter tags */
  tags: string[];
}

interface GraphEdge {
  source: string;
  target: string;
}

/** 解析 Markdown body 中所有 [text](*.md) 相对链接 */
function extractLinks(body: string, conceptId: string): string[] {
  const linkRe = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  const targets: string[] = [];
  const dir = conceptId.includes("/") ? conceptId.slice(0, conceptId.lastIndexOf("/")) : "";

  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(body)) !== null) {
    const rawTarget = m[2];
    if (rawTarget.startsWith("http")) continue;

    let resolved: string;
    if (rawTarget.startsWith("../")) {
      resolved = rawTarget.slice(3).replace(/\.md$/, "");
    } else if (rawTarget.startsWith("./")) {
      const same = rawTarget.slice(2).replace(/\.md$/, "");
      resolved = dir ? `${dir}/${same}` : same;
    } else {
      const clean = rawTarget.replace(/\.md$/, "");
      resolved = dir ? `${dir}/${clean}` : clean;
    }
    targets.push(resolved);
  }
  return [...new Set(targets)];
}

/** 递归扫描目录，返回所有 .md 文件（排除 index.md） */
function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMdFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md")
      results.push(full);
  }
  return results;
}

const TYPE_COLORS: Record<string, string> = {
  "JS Syntax": "#4A90D9",
  "JS Topic": "#7B68EE",
  "JS Builtin": "#50C878",
  "JS Pattern": "#FF8C00",
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#888";
}

/** 构建图谱数据，边去重（source < target 字典序保留一条，避免双向重复） */
export function buildGraph(
  bundleRoot: string
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const files = findMdFiles(bundleRoot);
  const nodes: GraphNode[] = [];
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  const validIds = new Set<string>();

  // 第一遍：收集节点
  for (const f of files) {
    try {
      const text = fs.readFileSync(f, "utf-8");
      const doc = parseOKF(text);
      const conceptId = pathToConceptId(bundleRoot, f);
      validIds.add(conceptId);
      const tags = doc.frontmatter.tags;
      nodes.push({
        id: conceptId,
        label: (doc.frontmatter.title as string) ?? conceptId,
        type: (doc.frontmatter.type as string) ?? "Unknown",
        description: (doc.frontmatter.description as string) ?? "",
        body: doc.body,
        resource: (doc.frontmatter.resource as string) ?? "",
        tags: Array.isArray(tags) ? (tags as string[]) : [],
      });
    } catch {
      // skip
    }
  }

  // 第二遍：收集边（去重：两端排序后拼 key，重复则跳过）
  for (const f of files) {
    try {
      const text = fs.readFileSync(f, "utf-8");
      const doc = parseOKF(text);
      const conceptId = pathToConceptId(bundleRoot, f);
      for (const target of extractLinks(doc.body, conceptId)) {
        if (!validIds.has(target) || target === conceptId) continue;
        // 去重：同一对节点只保留一条边
        const key = [conceptId, target].sort().join("|||");
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ source: conceptId, target });
      }
    } catch {
      // skip
    }
  }

  return { nodes, edges };
}

/**
 * 将 Markdown 文本转换为安全 HTML（内联版，不依赖外部库）
 * 只处理最常用的语法：标题、代码块、行内代码、粗体、列表、链接、空行
 */
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];

  for (const raw of lines) {
    const line = raw;

    // 代码块开关
    if (line.trimStart().startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim() || "text";
        codeBuf = [];
      } else {
        const escaped = codeBuf.join("\n")
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        out.push(`<pre class="code-block" data-lang="${codeLang}"><code>${escaped}</code></pre>`);
        inCode = false;
        codeLang = "";
        codeBuf = [];
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level} class="md-h${level}">${escInline(h[2])}</h${level}>`);
      continue;
    }

    // 列表
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) { out.push(`<li>${escInline(li[1])}</li>`); continue; }

    // 空行
    if (line.trim() === "") { out.push("<br/>"); continue; }

    // 普通段落
    out.push(`<p>${escInline(line)}</p>`);
  }

  // 把连续的 <li> 包进 <ul>
  const joined = out.join("\n");
  return joined.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`);
}

function escInline(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // 粗体
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // 链接（只保留文字，不跳转）
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '<span class="link-text">$1</span>');
}

/** 生成 viz.html 完整内容 */
export function generateVizHtml(bundleRoot: string): string {
  const { nodes, edges } = buildGraph(bundleRoot);

  // 把 body 转成 HTML，存入节点数据
  const elements = [
    ...nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        description: n.description,
        bodyHtml: mdToHtml(n.body),
        resource: n.resource,
        tags: n.tags,
        color: typeColor(n.type),
      },
    })),
    ...edges.map((e, i) => ({
      data: { id: `e${i}`, source: e.source, target: e.target },
    })),
  ];

  const legendHtml = Object.entries(TYPE_COLORS)
    .map(([type, color]) => `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${type}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8"/>
<title>OKF Knowledge Graph — ${path.basename(bundleRoot)}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
  background: #0d1117; color: #c9d1d9;
  display: flex; height: 100vh; overflow: hidden;
}

/* ── 图谱区 ── */
#cy-wrap { flex: 1; position: relative; min-width: 0; }
#cy { width: 100%; height: 100%; }

/* ── 左侧面板 ── */
#left-panel {
  position: absolute; top: 12px; left: 12px; z-index: 20;
  background: rgba(13,17,23,0.93); border: 1px solid #30363d;
  border-radius: 10px; padding: 14px 16px; width: 240px;
  backdrop-filter: blur(8px);
}
#left-panel h2 { font-size: 14px; color: #e6edf3; margin-bottom: 6px; }
#left-panel .stats { font-size: 12px; color: #8b949e; margin-bottom: 10px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; margin: 4px 0; color: #c9d1d9; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
#hint { margin-top: 10px; font-size: 11px; color: #6e7681; border-top: 1px solid #21262d; padding-top: 8px; }

/* ── 右侧文档面板 ── */
#doc-panel {
  width: 420px; flex-shrink: 0;
  background: #161b22; border-left: 1px solid #30363d;
  overflow-y: auto; display: none; flex-direction: column;
}
#doc-header {
  position: sticky; top: 0; z-index: 5;
  background: #161b22; border-bottom: 1px solid #30363d;
  padding: 14px 18px 12px;
}
#doc-header .doc-type {
  display: inline-block; font-size: 11px; font-weight: 600;
  padding: 2px 9px; border-radius: 12px; margin-bottom: 8px;
}
#doc-header h2 { font-size: 18px; color: #e6edf3; margin-bottom: 4px; }
#doc-header .doc-desc { font-size: 13px; color: #8b949e; line-height: 1.5; }
#doc-header .doc-meta { margin-top: 8px; font-size: 11px; color: #6e7681; }
#doc-header .doc-tags { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.tag {
  background: #21262d; border: 1px solid #30363d;
  border-radius: 12px; padding: 1px 8px; font-size: 11px; color: #8b949e;
}
#doc-body { padding: 16px 18px 32px; flex: 1; }
#close-btn {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; color: #8b949e;
  font-size: 18px; cursor: pointer; line-height: 1;
}
#close-btn:hover { color: #e6edf3; }

/* ── 文档内容样式 ── */
.md-h1, .md-h2 { color: #e6edf3; margin: 20px 0 8px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }
.md-h1 { font-size: 18px; }
.md-h2 { font-size: 15px; }
.md-h3 { color: #e6edf3; font-size: 14px; margin: 14px 0 6px; }
.md-h4 { color: #c9d1d9; font-size: 13px; margin: 10px 0 4px; }
p { font-size: 13px; line-height: 1.75; color: #c9d1d9; margin: 4px 0; }
ul { padding-left: 18px; margin: 4px 0; }
li { font-size: 13px; line-height: 1.75; color: #c9d1d9; margin: 2px 0; }
.code-block {
  background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
  padding: 12px 14px; margin: 8px 0; overflow-x: auto;
  font-family: "SF Mono", "Fira Code", Consolas, monospace; font-size: 12px;
  line-height: 1.6; color: #e6edf3;
}
.code-block::before {
  content: attr(data-lang);
  display: block; font-size: 10px; color: #6e7681;
  margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
}
.inline-code {
  background: #161b22; border: 1px solid #30363d;
  border-radius: 4px; padding: 1px 5px;
  font-family: "SF Mono", "Fira Code", monospace; font-size: 12px; color: #f0a94a;
}
.link-text { color: #58a6ff; }
a { color: #58a6ff; }
br { display: block; margin: 4px 0; }
</style>
</head>
<body>

<div id="cy-wrap">
  <div id="left-panel">
    <h2>OKF Knowledge Graph</h2>
    <div class="stats">${nodes.length} concepts &nbsp;·&nbsp; ${edges.length} links</div>
    ${legendHtml}
    <div id="hint">点击节点查看文档详情 →</div>
  </div>
  <div id="cy"></div>
</div>

<div id="doc-panel">
  <div id="doc-header">
    <button id="close-btn" title="关闭">×</button>
    <div class="doc-type" id="doc-type"></div>
    <h2 id="doc-title"></h2>
    <div class="doc-desc" id="doc-desc"></div>
    <div class="doc-tags" id="doc-tags"></div>
    <div class="doc-meta" id="doc-meta"></div>
  </div>
  <div id="doc-body" id="doc-body-content"></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.2/cytoscape.min.js"></script>
<script>
const elements = ${JSON.stringify(elements, null, 2)};

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements,
  style: [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'color': '#e6edf3',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '11px',
        'text-wrap': 'wrap',
        'text-max-width': '90px',
        'width': 'label',
        'height': 'label',
        'padding': '12px',
        'shape': 'round-rectangle',
        'border-width': 1,
        'border-color': 'rgba(255,255,255,0.12)',
        'transition-property': 'border-width, border-color, background-color',
        'transition-duration': '150ms',
      }
    },
    {
      selector: 'node:selected, node.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#ffffff',
        'z-index': 10,
      }
    },
    {
      selector: 'node.faded',
      style: { 'opacity': 0.25 }
    },
    {
      selector: 'edge',
      style: {
        'width': 1.2,
        'line-color': '#30363d',
        'target-arrow-color': '#444c56',
        'target-arrow-shape': 'triangle',
        'curve-style': 'straight',
        'opacity': 0.6,
        'transition-property': 'opacity, line-color',
        'transition-duration': '150ms',
      }
    },
    {
      selector: 'edge.highlighted',
      style: { 'line-color': '#58a6ff', 'target-arrow-color': '#58a6ff', 'opacity': 1, 'width': 2 }
    },
    {
      selector: 'edge.faded',
      style: { 'opacity': 0.06 }
    }
  ],
  layout: {
    name: 'cose',
    idealEdgeLength: 150,
    nodeOverlap: 30,
    refresh: 20,
    fit: true,
    padding: 60,
    randomize: false,
    componentSpacing: 120,
    nodeRepulsion: 600000,
    edgeElasticity: 80,
    nestingFactor: 3,
    gravity: 60,
    numIter: 1200,
    initialTemp: 180,
    coolingFactor: 0.95,
    minTemp: 1.0,
  }
});

// ── 文档面板逻辑 ──────────────────────────────────────────────────────────
const docPanel = document.getElementById('doc-panel');
const docType  = document.getElementById('doc-type');
const docTitle = document.getElementById('doc-title');
const docDesc  = document.getElementById('doc-desc');
const docTags  = document.getElementById('doc-tags');
const docMeta  = document.getElementById('doc-meta');
const docBody  = document.getElementById('doc-body');

function showDoc(d) {
  docType.textContent = d.type;
  docType.style.background = d.color + '22';
  docType.style.color = d.color;
  docType.style.border = '1px solid ' + d.color + '55';

  docTitle.textContent = d.label;
  docDesc.textContent  = d.description;
  docBody.innerHTML    = d.bodyHtml;

  docTags.innerHTML = (d.tags || []).map(t =>
    '<span class="tag">' + t + '</span>'
  ).join('');

  docMeta.innerHTML = d.resource
    ? '<a href="' + d.resource + '" target="_blank" rel="noopener">' + d.resource + '</a>'
    : 'id: ' + d.id;

  docPanel.style.display = 'flex';
  docBody.scrollTop = 0;
}

document.getElementById('close-btn').addEventListener('click', () => {
  docPanel.style.display = 'none';
  cy.elements().removeClass('highlighted faded');
});

// ── 节点点击：展示文档 + 高亮相邻节点 ──────────────────────────────────
cy.on('tap', 'node', (e) => {
  const node = e.target;
  const d = node.data();
  showDoc(d);

  // 高亮当前节点及相邻边/节点
  cy.elements().removeClass('highlighted faded');
  node.addClass('highlighted');
  const connected = node.connectedEdges();
  connected.addClass('highlighted');
  connected.connectedNodes().addClass('highlighted');
  cy.elements().not(node).not(connected).not(connected.connectedNodes()).addClass('faded');
});

// ── 点击空白：取消高亮 ────────────────────────────────────────────────
cy.on('tap', (e) => {
  if (e.target === cy) {
    cy.elements().removeClass('highlighted faded');
  }
});
</script>
</body>
</html>`;
}

/** 写入 viz.html 到 bundleRoot */
export function writeVizHtml(bundleRoot: string): string {
  const html = generateVizHtml(bundleRoot);
  const outPath = path.join(bundleRoot, "viz.html");
  fs.writeFileSync(outPath, html, "utf-8");
  const { nodes, edges } = buildGraph(bundleRoot);
  console.log(
    `[viz] Generated viz.html — ${nodes.length} nodes, ${edges.length} edges → ${outPath}`
  );
  return outPath;
}
