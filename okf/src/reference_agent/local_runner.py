"""
本地 Runner —— 使用国产/开源 LLM 替代 google-adk 的参考 Agent。

完全复用原有工具函数（bundle_tools, source_tools），
只替换 LLM 调用层。
"""
from __future__ import annotations

import logging
from pathlib import Path

from reference_agent.bundle.index import regenerate_indexes
from reference_agent.llm_runner import ToolCallRunner
from reference_agent.sources.base import Source
from reference_agent.tools.bundle_tools import read_existing_doc, write_concept_doc
from reference_agent.tools.context import set_context
from reference_agent.tools.source_tools import list_concepts, read_concept_raw, sample_rows
from reference_agent.tools.web_tools import fetch_url

log = logging.getLogger(__name__)

# 加载提示词
from importlib import resources as _res

def _load_prompt(filename: str) -> str:
    return (
        _res.files("reference_agent.prompts")
        .joinpath(filename)
        .read_text(encoding="utf-8")
    )


class LocalRunner:
    """
    使用本地/国产 LLM 的 Reference Runner。

    参数：
        source      - 数据源（SQLiteSource 或 BigQuerySource）
        bundle_root - OKF 输出目录
        web_seeds   - Web Pass 种子 URL 列表（传 None 跳过 web pass）
        web_max_pages - web 爬取最大页数
    """

    def __init__(
        self,
        source: Source,
        bundle_root: Path,
        web_seeds: list[str] | None = None,
        web_max_pages: int = 20,
    ):
        self.source = source
        self.bundle_root = Path(bundle_root)
        self.bundle_root.mkdir(parents=True, exist_ok=True)
        self.web_seeds = list(web_seeds or [])
        self.web_max_pages = web_max_pages

        # 注入全局上下文（原有工具函数依赖此 context）
        set_context(source, self.bundle_root)

        # BQ Pass 使用的工具
        self._bq_tools = [
            list_concepts,
            read_concept_raw,
            sample_rows,
            read_existing_doc,
            write_concept_doc,
        ]
        # Web Pass 使用的工具
        self._web_tools = [
            list_concepts,
            read_concept_raw,
            read_existing_doc,
            write_concept_doc,
            fetch_url,
        ]

    def enrich_concept(self, concept_id: str) -> None:
        """对单个 concept 运行 BQ pass。"""
        runner = ToolCallRunner(
            system_prompt=_load_prompt("reference_instruction.md"),
            tools=self._bq_tools,
        )
        message = (
            f"Enrich the concept with id: {concept_id}\n"
            f"Follow the standard workflow and write exactly one document for this concept."
        )
        runner.run(message)

    def run_web_pass(self) -> None:
        """运行 Web 增强 pass（需要 web_seeds）。"""
        if not self.web_seeds:
            return

        from reference_agent.tools.context import set_web_state, clear_web_state
        from urllib.parse import urlparse

        allowed_hosts = {urlparse(s).netloc for s in self.web_seeds if urlparse(s).netloc}
        set_web_state(allowed_hosts, self.web_max_pages, seeds=self.web_seeds)

        try:
            runner = ToolCallRunner(
                system_prompt=_load_prompt("web_ingestion_instruction.md"),
                tools=self._web_tools,
            )
            seed_lines = "\n".join(f"- {s}" for s in self.web_seeds)
            message = (
                f"Ingest the following seed URLs and crawl outward as your judgment directs.\n\n"
                f"Seed URLs:\n{seed_lines}\n\n"
                f"Hard limits: Max pages: {self.web_max_pages}, Max depth: 2\n"
                f"Follow the web-ingestion workflow."
            )
            runner.run(message)
        finally:
            clear_web_state()

    def enrich_all(self, only: list[str] | None = None) -> int:
        """对数据源的所有 concept 运行 enrich，返回处理数量。"""
        concepts = self.source.list_concepts()

        if only:
            only_set = set(only)
            concepts = [c for c in concepts if c.id_str in only_set]

        count = 0
        for ref in concepts:
            log.info("Enriching %s (%s)", ref.id_str, ref.type)
            try:
                self.enrich_concept(ref.id_str)
                count += 1
            except Exception as e:
                log.error("Failed to enrich %s: %s", ref.id_str, e)

        self.run_web_pass()

        log.info("Regenerating index.md files in %s", self.bundle_root)
        # 用简单 fallback 方式生成 index（不调用 Gemini）
        _regenerate_indexes_local(self.bundle_root)

        return count


def _regenerate_indexes_local(bundle_root: Path) -> None:
    """简单版 index 生成器，不依赖 LLM。"""
    import yaml

    def _get_frontmatter(md_path: Path) -> dict:
        text = md_path.read_text(encoding="utf-8")
        if text.startswith("---"):
            try:
                end = text.index("---", 3)
                return yaml.safe_load(text[3:end]) or {}
            except Exception:
                pass
        return {}

    for dirpath in sorted(bundle_root.rglob("*")):
        if not dirpath.is_dir():
            continue

        entries: list[str] = []
        for child in sorted(dirpath.iterdir()):
            if child.name in ("index.md", "log.md"):
                continue
            if child.is_file() and child.suffix == ".md":
                fm = _get_frontmatter(child)
                title = fm.get("title") or child.stem
                desc = fm.get("description") or ""
                line = f"* [{title}]({child.name})"
                if desc:
                    line += f" - {desc}"
                entries.append(line)
            elif child.is_dir():
                sub_index = child / "index.md"
                label = child.name
                line = f"* [{label}/]({child.name}/) - {label} directory"
                entries.append(line)

        if entries:
            index_path = dirpath / "index.md"
            rel = dirpath.relative_to(bundle_root)
            header = f"# {rel}" if str(rel) != "." else "# Bundle Index"
            content = header + "\n\n" + "\n".join(entries) + "\n"
            index_path.write_text(content, encoding="utf-8")
