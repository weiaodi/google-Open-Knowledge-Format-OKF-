#!/usr/bin/env python3
"""
本地运行入口 —— 使用 SQLite + 国产 LLM 跑 OKF Reference Agent。

使用方式：
    # 1. 设置 LLM 环境变量
    export LLM_PROVIDER=deepseek      # 或 qwen
    export LLM_API_KEY=sk-xxxxxxxx

    # 2. 运行（使用 demo 数据库）
    python -m reference_agent.local_main

    # 3. 生成可视化
    python -m reference_agent.local_main --visualize

    # 4. 使用自己的 SQLite 数据库
    python -m reference_agent.local_main --db /path/to/your.db --out ./my_bundle
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="local_main",
        description="本地 OKF Reference Agent（SQLite + 国产 LLM）",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="SQLite 数据库路径（默认自动生成 demo.db）",
    )
    parser.add_argument(
        "--out",
        default="./bundles/local_demo",
        help="OKF bundle 输出目录（默认 ./bundles/local_demo）",
    )
    parser.add_argument(
        "--concept",
        action="append",
        default=None,
        help="只处理指定 concept id（如 tables/users），可重复",
    )
    parser.add_argument(
        "--no-web",
        action="store_true",
        help="跳过 web pass",
    )
    parser.add_argument(
        "--visualize",
        action="store_true",
        help="运行完后生成 viz.html",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if args.verbose:
        logging.getLogger("reference_agent").setLevel(logging.DEBUG)
    for noisy in ("httpx", "openai", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # ── 准备 SQLite 数据库 ────────────────────────────────────────────────
    db_path = args.db
    if db_path is None:
        db_path = _ensure_demo_db()
        print(f"[demo] 使用 demo 数据库: {db_path}", file=sys.stderr)

    # ── 运行 Agent ────────────────────────────────────────────────────────
    from reference_agent.local_runner import LocalRunner
    from reference_agent.sources.sqlite import SQLiteSource

    source = SQLiteSource(db_path)
    bundle_root = Path(args.out)

    web_seeds = None if args.no_web else _default_web_seeds()
    runner = LocalRunner(
        source=source,
        bundle_root=bundle_root,
        web_seeds=web_seeds,
        web_max_pages=10,
    )

    n = runner.enrich_all(only=args.concept)
    print(f"Enriched {n} concept(s) into {bundle_root}", file=sys.stderr)

    if args.visualize:
        from reference_agent.viewer import generate_visualization
        out_html = bundle_root / "viz.html"
        stats = generate_visualization(bundle_root, out_html, bundle_name="Local Demo")
        print(
            f"Wrote {stats['concepts']} concept(s), "
            f"{stats['edges']} edge(s), "
            f"{stats['bytes']} bytes → {out_html}",
            file=sys.stderr,
        )
        import subprocess, platform
        if platform.system() == "Darwin":
            subprocess.Popen(["open", str(out_html)])

    return 0


def _ensure_demo_db(path: str = "demo.db") -> str:
    """生成一个演示用 SQLite 数据库（电商场景）。"""
    import sqlite3

    p = Path(path)
    if p.exists():
        return str(p)

    print(f"[demo] 创建演示数据库: {path}", file=sys.stderr)
    conn = sqlite3.connect(path)
    conn.executescript("""
    CREATE TABLE users (
        user_id     INTEGER PRIMARY KEY,
        username    TEXT NOT NULL UNIQUE,
        email       TEXT NOT NULL UNIQUE,
        created_at  TEXT NOT NULL,
        country     TEXT,
        age         INTEGER
    );

    CREATE TABLE products (
        product_id   INTEGER PRIMARY KEY,
        name         TEXT NOT NULL,
        category     TEXT,
        price        REAL NOT NULL,
        stock        INTEGER DEFAULT 0,
        description  TEXT
    );

    CREATE TABLE orders (
        order_id    INTEGER PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(user_id),
        placed_at   TEXT NOT NULL,
        status      TEXT DEFAULT 'pending',
        total_usd   REAL
    );

    CREATE TABLE order_items (
        item_id     INTEGER PRIMARY KEY,
        order_id    INTEGER NOT NULL REFERENCES orders(order_id),
        product_id  INTEGER NOT NULL REFERENCES products(product_id),
        quantity    INTEGER NOT NULL,
        unit_price  REAL NOT NULL
    );

    CREATE TABLE events (
        event_id    INTEGER PRIMARY KEY,
        user_id     INTEGER REFERENCES users(user_id),
        event_type  TEXT NOT NULL,
        page        TEXT,
        occurred_at TEXT NOT NULL,
        session_id  TEXT
    );

    INSERT INTO users VALUES
      (1,'alice','alice@example.com','2024-01-10','CN',28),
      (2,'bob','bob@example.com','2024-02-15','US',34),
      (3,'carol','carol@example.com','2024-03-01','CN',22);

    INSERT INTO products VALUES
      (1,'Wireless Mouse','Electronics',29.99,150,'High-precision wireless mouse'),
      (2,'Mechanical Keyboard','Electronics',89.99,80,'RGB mechanical keyboard'),
      (3,'USB-C Hub','Electronics',39.99,200,'7-in-1 USB-C hub'),
      (4,'Notebook A5','Stationery',9.99,500,'Lined A5 notebook'),
      (5,'Coffee Mug','Kitchen',14.99,300,'350ml ceramic mug');

    INSERT INTO orders VALUES
      (1,1,'2024-03-10','completed',59.98),
      (2,2,'2024-03-11','shipped',89.99),
      (3,1,'2024-03-15','pending',29.99);

    INSERT INTO order_items VALUES
      (1,1,1,1,29.99),(2,1,3,1,29.99),
      (3,2,2,1,89.99),
      (4,3,1,1,29.99);

    INSERT INTO events VALUES
      (1,1,'page_view','/home','2024-03-10T09:00:00','sess_001'),
      (2,1,'add_to_cart','/product/1','2024-03-10T09:05:00','sess_001'),
      (3,1,'purchase','/checkout','2024-03-10T09:10:00','sess_001'),
      (4,2,'page_view','/home','2024-03-11T14:00:00','sess_002'),
      (5,2,'purchase','/checkout','2024-03-11T14:20:00','sess_002');
    """)
    conn.commit()
    conn.close()
    return path


def _default_web_seeds() -> list[str] | None:
    """默认不跑 web pass（避免访问外部网站失败）。"""
    return None


if __name__ == "__main__":
    sys.exit(main())
