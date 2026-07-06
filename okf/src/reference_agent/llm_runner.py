"""
轻量 LLM Runner —— 替代 google-adk，支持任何 OpenAI 兼容接口。

支持的模型提供商（通过环境变量配置）：
  - DeepSeek:    LLM_PROVIDER=deepseek  LLM_API_KEY=sk-xxx
  - 通义千问:    LLM_PROVIDER=qwen      LLM_API_KEY=sk-xxx
  - OpenAI:      LLM_PROVIDER=openai    LLM_API_KEY=sk-xxx
  - 自定义:      LLM_PROVIDER=custom    LLM_API_KEY=xxx  LLM_BASE_URL=http://...

前置产物（输入）：
  - system_prompt: str       — LLM 的角色和任务指令（从 prompts/*.md 加载）
  - tools: list[Callable]    — 允许 LLM 调用的 Python 函数列表
  - user_message: str        — 具体的任务描述（"处理 concept_id: syntax/arrow_function"）

后置产物（输出）：
  - 返回值 str               — LLM 最后一轮的文字确认（通常可忽略）
  - 副作用（真正的产出）      — tools 中的 write_concept_doc 被调用，在磁盘写入/更新 .md 文件
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Callable

from openai import OpenAI

log = logging.getLogger(__name__)

# ── 模型提供商配置 ──────────────────────────────────────────────────────────

_PROVIDERS: dict[str, dict[str, str]] = {
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-chat",
    },
    "qwen": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "default_model": "qwen-plus",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
    },
}

# ── dict 类型参数的通用约束描述（可被外部覆盖，见 OBJECT_PARAM_HINTS）────────

# 当工具函数的某个参数类型是 dict/object 时，
# 这里可以为特定参数名注入补充说明，指导 LLM 传正确格式。
# key = 参数名, value = 额外 description 字符串
# 如需针对新工具的新参数添加提示，在此处扩展即可，无需修改核心逻辑。
OBJECT_PARAM_HINTS: dict[str, str] = {
    "frontmatter": (
        "MUST be a JSON object (not a string, not YAML text). "
        "Required keys: type (string), title (string), description (string). "
        "Optional: resource (string), tags (array of strings). "
        'Example: {"type": "SQLite Table", "title": "Users", '
        '"description": "One row per registered user."}'
    ),
}

# ── 字符串强制转 dict 的参数名集合（遇到这些参数被传成字符串时自动修正）──────
# 原先只处理 "frontmatter"，现在改成可配置集合
COERCE_TO_DICT_PARAMS: frozenset[str] = frozenset({"frontmatter"})


def _build_client() -> tuple[OpenAI, str]:
    """根据环境变量构建 OpenAI 客户端，返回 (client, model_name)。"""
    provider = os.environ.get("LLM_PROVIDER", "deepseek").lower()
    api_key = os.environ.get("LLM_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "请设置环境变量 LLM_API_KEY。\n"
            "  DeepSeek: export LLM_API_KEY=sk-xxx  (https://platform.deepseek.com)\n"
            "  通义千问: export LLM_API_KEY=sk-xxx  (https://dashscope.console.aliyun.com)\n"
            "同时设置 LLM_PROVIDER=deepseek 或 LLM_PROVIDER=qwen"
        )

    if provider == "custom":
        base_url = os.environ.get("LLM_BASE_URL", "")
        if not base_url:
            raise RuntimeError("LLM_PROVIDER=custom 时必须设置 LLM_BASE_URL")
        model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
    else:
        cfg = _PROVIDERS.get(provider, _PROVIDERS["deepseek"])
        base_url = os.environ.get("LLM_BASE_URL", cfg["base_url"])
        model = os.environ.get("LLM_MODEL", cfg["default_model"])

    client = OpenAI(api_key=api_key, base_url=base_url)
    log.info("[LLM] provider=%s model=%s base_url=%s", provider, model, base_url)
    return client, model


# ── Tool Call 执行引擎 ──────────────────────────────────────────────────────

def _is_dict_annotation(annotation: Any) -> bool:
    """判断类型注解是否是 dict 类型（包括 dict[str,Any] 等泛型）。"""
    if annotation is dict:
        return True
    origin = getattr(annotation, "__origin__", None)
    if origin is dict:
        return True
    return False


def _is_list_annotation(annotation: Any) -> bool:
    """判断类型注解是否是 list 类型。"""
    if annotation is list:
        return True
    origin = getattr(annotation, "__origin__", None)
    if origin is list:
        return True
    return False


def _make_tool_schema(
    fn: Callable,
    object_param_hints: dict[str, str] | None = None,
) -> dict[str, Any]:
    """把普通 Python 函数转成 OpenAI function-calling 的 schema。

    object_param_hints: 额外的参数描述，key=参数名，value=description 字符串。
    默认使用模块级 OBJECT_PARAM_HINTS，可在调用时覆盖。
    """
    import inspect
    import re

    hints = OBJECT_PARAM_HINTS if object_param_hints is None else object_param_hints

    sig = inspect.signature(fn)
    doc = (fn.__doc__ or "").strip()
    # 只取第一段简短描述
    short_doc = re.split(r"\n\s*\n", doc)[0].replace("\n", " ").strip()

    properties: dict[str, Any] = {}
    required: list[str] = []
    for name, param in sig.parameters.items():
        annotation = param.annotation

        if annotation is inspect.Parameter.empty:
            ptype = "string"
        elif annotation is int:
            ptype = "integer"
        elif annotation is float:
            ptype = "number"
        elif annotation is bool:
            ptype = "boolean"
        elif _is_dict_annotation(annotation):
            ptype = "object"
        elif _is_list_annotation(annotation):
            ptype = "array"
        else:
            ptype = "string"

        prop: dict[str, Any] = {"type": ptype}
        # 对 object 类型参数注入补充说明（从 hints 查找，不再写死参数名）
        if ptype == "object" and name in hints:
            prop["description"] = hints[name]
            prop["additionalProperties"] = True
        properties[name] = prop
        if param.default is inspect.Parameter.empty:
            required.append(name)

    return {
        "type": "function",
        "function": {
            "name": fn.__name__,
            "description": short_doc,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


class ToolCallRunner:
    """
    单轮 ReAct 循环：发消息 → LLM 返回 tool_calls → 执行工具 → 反馈结果 → 循环。
    直到 LLM 不再调用工具为止。

    前置产物（实例化所需）：
      system_prompt  — 从 prompts/*.md 文件读取的系统指令
      tools          — Python 函数列表（bundle_tools + source_tools 里的函数）

    run() 的前后产物：
      输入: user_message  — 任务描述字符串，如 "Enrich concept: syntax/arrow_function"
      输出: str           — LLM 最终的文字确认（通常可忽略）
      副作用:             — tools 里的 write_concept_doc 被 LLM 主动调用，写入磁盘 .md 文件
    """

    DEFAULT_MAX_ROUNDS = 40  # 默认最大轮次，防止死循环

    def __init__(
        self,
        system_prompt: str,
        tools: list[Callable],
        max_rounds: int | None = None,
        object_param_hints: dict[str, str] | None = None,
        coerce_to_dict_params: frozenset[str] | None = None,
    ):
        """
        参数：
          system_prompt        — LLM 系统提示词
          tools                — 允许 LLM 调用的 Python 函数列表
          max_rounds           — 最大工具调用轮次（默认 DEFAULT_MAX_ROUNDS=40）
          object_param_hints   — 覆盖 OBJECT_PARAM_HINTS，为 object 类型参数注入额外描述
          coerce_to_dict_params — 覆盖 COERCE_TO_DICT_PARAMS，指定哪些参数被传成字符串时自动修正
        """
        self._client, self._model = _build_client()
        self._system_prompt = system_prompt
        self._tools = {fn.__name__: fn for fn in tools}
        self._schemas = [_make_tool_schema(fn, object_param_hints) for fn in tools]
        self._max_rounds = max_rounds if max_rounds is not None else self.DEFAULT_MAX_ROUNDS
        self._coerce_params = coerce_to_dict_params if coerce_to_dict_params is not None else COERCE_TO_DICT_PARAMS

    def run(self, user_message: str) -> str:
        """运行一次完整的 tool-call 循环，返回最终文本回复。

        前置产物: user_message（任务描述）
        后置产物:
          - 返回值 str：LLM 最后一轮的确认文字（通常可忽略）
          - 副作用：write_concept_doc 等工具函数执行时在磁盘写入/更新 .md 文件
        """
        messages: list[dict] = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": user_message},
        ]

        for round_idx in range(self._max_rounds):
            log.debug("[LLM] round %d, messages=%d", round_idx, len(messages))
            response = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                tools=self._schemas if self._schemas else None,
                tool_choice="auto" if self._schemas else None,
            )
            choice = response.choices[0]
            msg = choice.message

            # 把 assistant 消息加入历史
            messages.append(msg.model_dump(exclude_unset=False))

            # 没有 tool_calls → 对话结束
            tool_calls = getattr(msg, "tool_calls", None) or []
            if not tool_calls:
                return msg.content or ""

            # 执行所有 tool_calls
            for tc in tool_calls:
                fn_name = tc.function.name
                try:
                    raw_args = tc.function.arguments or "{}"
                    kwargs = json.loads(raw_args)
                except json.JSONDecodeError:
                    kwargs = {}

                log.info("[tool] → %s(%s)", fn_name, _compact(kwargs))
                fn = self._tools.get(fn_name)
                if fn is None:
                    result = {"error": f"unknown tool: {fn_name}"}
                else:
                    try:
                        # 兼容处理：对 _coerce_params 中声明的参数，若被传成字符串则自动修正
                        for param_name in self._coerce_params:
                            if param_name in kwargs and isinstance(kwargs[param_name], str):
                                kwargs[param_name] = _coerce_frontmatter(kwargs[param_name])
                        result = fn(**kwargs)
                    except Exception as exc:
                        result = {"error": str(exc)}

                log.info("[tool] ← %s: %s", fn_name, _compact(result))
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })

        log.warning("[LLM] max_rounds=%d reached, stopping", self._max_rounds)
        return ""


def _compact(val: Any, limit: int = 120) -> str:
    s = json.dumps(val, ensure_ascii=False, default=str)
    return s if len(s) <= limit else s[:limit] + "…"


def _coerce_frontmatter(raw: str) -> dict[str, Any]:
    """把 LLM 错误传入的字符串形式 frontmatter 转成 dict。
    尝试顺序：JSON → YAML → 手动解析 key: value 行。
    """
    import yaml

    raw = raw.strip()
    # 去掉 YAML 分隔符
    if raw.startswith("---"):
        lines = raw.splitlines()
        start = 1
        end = len(lines)
        for i, line in enumerate(lines[1:], 1):
            if line.strip() == "---":
                end = i
                break
        raw = "\n".join(lines[start:end])

    # 1. 尝试 JSON
    try:
        result = json.loads(raw)
        if isinstance(result, dict):
            return result
    except (json.JSONDecodeError, ValueError):
        pass

    # 2. 尝试 YAML
    try:
        result = yaml.safe_load(raw)
        if isinstance(result, dict):
            return result
    except Exception:
        pass

    # 3. 手动解析 "key: value" 行
    result = {}
    for line in raw.splitlines():
        line = line.strip()
        if ":" in line:
            k, _, v = line.partition(":")
            result[k.strip()] = v.strip().strip('"').strip("'")
    return result if result else {"type": "Unknown", "title": "Unknown", "description": raw[:100]}
