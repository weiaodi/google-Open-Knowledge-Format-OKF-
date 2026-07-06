"""
本地 SQLite Source —— 替代 BigQuerySource，无需 Google Cloud 账号。

用法：
    from reference_agent.sources.sqlite import SQLiteSource
    source = SQLiteSource(db_path="demo.db")

数据库要求：普通 SQLite 文件，任何有表结构的 .db 文件均可。
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from reference_agent.sources.base import ConceptRef, Source


class SQLiteSource(Source):
    name = "sqlite"

    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        if not self.db_path.exists():
            raise FileNotFoundError(f"SQLite 数据库文件不存在: {db_path}")
        self._db_name = self.db_path.stem
        self._concepts_cache: list[ConceptRef] | None = None

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _resource_uri(self, table: str | None = None) -> str:
        base = f"sqlite:///{self.db_path.resolve()}"
        return f"{base}/{table}" if table else base

    def list_concepts(self) -> list[ConceptRef]:
        if self._concepts_cache is not None:
            return self._concepts_cache

        concepts: list[ConceptRef] = [
            ConceptRef(
                id=("datasets", self._db_name),
                type="SQLite Database",
                resource=self._resource_uri(),
                hint={"db_path": str(self.db_path), "db_name": self._db_name},
            )
        ]

        with self._conn() as conn:
            rows = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()

        for row in rows:
            table_name = row["name"]
            concepts.append(
                ConceptRef(
                    id=("tables", table_name),
                    type="SQLite Table",
                    resource=self._resource_uri(table_name),
                    hint={"table_name": table_name, "db_name": self._db_name},
                )
            )

        self._concepts_cache = concepts
        return concepts

    def read_concept(self, ref: ConceptRef) -> dict[str, Any]:
        if ref.type == "SQLite Database":
            with self._conn() as conn:
                tables = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ).fetchall()
                table_names = [r["name"] for r in tables]
                count = conn.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
                ).fetchone()[0]
            return {
                "db_name": self._db_name,
                "db_path": str(self.db_path),
                "table_count": count,
                "tables": table_names,
            }

        if ref.type == "SQLite Table":
            table_name = ref.hint["table_name"]
            with self._conn() as conn:
                # 获取列信息
                columns = conn.execute(
                    f"PRAGMA table_info(`{table_name}`)"
                ).fetchall()
                # 获取行数
                try:
                    row_count = conn.execute(
                        f"SELECT COUNT(*) FROM `{table_name}`"
                    ).fetchone()[0]
                except Exception:
                    row_count = None
                # 获取索引信息
                indexes = conn.execute(
                    f"PRAGMA index_list(`{table_name}`)"
                ).fetchall()

            schema = []
            for col in columns:
                entry: dict[str, Any] = {
                    "name": col["name"],
                    "type": col["type"] or "TEXT",
                    "not_null": bool(col["notnull"]),
                    "primary_key": bool(col["pk"]),
                }
                if col["dflt_value"] is not None:
                    entry["default"] = col["dflt_value"]
                schema.append(entry)

            return {
                "db_name": self._db_name,
                "table_name": table_name,
                "row_count": row_count,
                "schema": schema,
                "index_count": len(indexes),
            }

        raise ValueError(f"Unknown concept type: {ref.type}")

    def sample_rows(self, ref: ConceptRef, n: int = 5) -> list[dict[str, Any]] | None:
        if ref.type != "SQLite Table":
            return None
        table_name = ref.hint["table_name"]
        try:
            with self._conn() as conn:
                rows = conn.execute(
                    f"SELECT * FROM `{table_name}` LIMIT {int(n)}"
                ).fetchall()
            return [dict(row) for row in rows]
        except Exception:
            return None
