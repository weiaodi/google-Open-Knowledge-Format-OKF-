#!/usr/bin/env python3
"""
JavaScript 语法知识库生成器
使用 DeepSeek + OKF 自动生成 JS 知识图谱文档

用法：
    export LLM_PROVIDER=deepseek
    export LLM_API_KEY=sk-xxx

    # 跑全部概念
    python -m reference_agent.js_main

    # 只跑指定概念
    python -m reference_agent.js_main --concept syntax/arrow_function --concept builtin/promise

    # 跑完生成可视化
    python -m reference_agent.js_main --visualize
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

BUNDLE_OUT = "./bundles/js_syntax"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="js_main", description="JS 语法 OKF 知识库生成器")
    parser.add_argument("--concept", action="append", default=None,
                        help="只处理指定概念（如 syntax/arrow_function），可重复")
    parser.add_argument("--out", default=BUNDLE_OUT, help=f"输出目录（默认 {BUNDLE_OUT}）")
    parser.add_argument("--visualize", action="store_true", help="生成 viz.html 并打开")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if args.verbose:
        logging.getLogger("reference_agent").setLevel(logging.DEBUG)
    for noisy in ("httpx", "openai", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    from reference_agent.sources.js_syntax import JSSyntaxSource
    from reference_agent.tools.context import set_context
    from reference_agent.llm_runner import ToolCallRunner
    from reference_agent.tools.bundle_tools import read_existing_doc, write_concept_doc
    from reference_agent.tools.source_tools import list_concepts, read_concept_raw, sample_rows
    from importlib import resources as _res

    bundle_root = Path(args.out)
    bundle_root.mkdir(parents=True, exist_ok=True)

    source = JSSyntaxSource()
    set_context(source, bundle_root)

    # 加载 JS 专用提示词
    prompt = (
        _res.files("reference_agent.prompts")
        .joinpath("js_instruction.md")
        .read_text(encoding="utf-8")
    )

    tools = [list_concepts, read_concept_raw, read_existing_doc, write_concept_doc]

    concepts = source.list_concepts()
    if args.concept:
        only_set = set(args.concept)
        concepts = [c for c in concepts if c.id_str in only_set]

    total = len(concepts)
    print(f"[js_main] 准备处理 {total} 个 JS 语法概念...", file=sys.stderr)

    count = 0
    for i, ref in enumerate(concepts, 1):
        print(f"\n[{i}/{total}] 正在生成: {ref.id_str} ({ref.type})", file=sys.stderr)
        runner = ToolCallRunner(system_prompt=prompt, tools=tools)
        message = (
            f"Enrich the JavaScript concept with id: {ref.id_str}\n"
            f"Type: {ref.type}\n"
            f"Write a comprehensive OKF document for this concept. "
            f"Include syntax, examples, key points, and common mistakes."
        )
        try:
            runner.run(message)
            count += 1
            print(f"  ✓ 完成", file=sys.stderr)
        except Exception as e:
            print(f"  ✗ 失败: {e}", file=sys.stderr)

    # 生成 index
    from reference_agent.local_runner import _regenerate_indexes_local
    _regenerate_indexes_local(bundle_root)
    print(f"\n[js_main] 生成完成：{count}/{total} 个概念 → {bundle_root}", file=sys.stderr)

    if args.visualize:
        from reference_agent.viewer import generate_visualization
        out_html = bundle_root / "viz.html"
        stats = generate_visualization(bundle_root, out_html, bundle_name="JavaScript 基础语法")
        print(
            f"[js_main] 可视化: {stats['concepts']} 概念, "
            f"{stats['edges']} 关系边, {stats['bytes']} bytes → {out_html}",
            file=sys.stderr,
        )
        import subprocess, platform
        if platform.system() == "Darwin":
            subprocess.Popen(["open", str(out_html)])

    return 0


if __name__ == "__main__":
    sys.exit(main())
