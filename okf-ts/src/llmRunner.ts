/**
 * llmRunner.ts — LLM 驱动引擎（替代 google-adk）
 *
 * 核心设计：
 *   - 使用标准 openai npm 包，兼容 DeepSeek / 通义千问 / OpenAI 等任何兼容接口
 *   - 工具通过 ToolDef 显式声明（含 JSON Schema），不依赖运行时反射
 *   - ReAct 循环：消息 → LLM → tool_calls → 执行 → 追加结果 → 循环
 *
 * 环境变量配置：
 *   LLM_PROVIDER   deepseek | qwen | openai | custom（默认 deepseek）
 *   LLM_API_KEY    API 密钥（必填）
 *   LLM_MODEL      覆盖默认模型名（可选）
 *   LLM_BASE_URL   覆盖默认 base URL（可选）
 *
 * 前置产物（输入）：
 *   system_prompt  — 从 prompts/jsInstruction.md 读取的角色说明
 *   tools          — ToolDef 列表（4 个工具函数）
 *   user_message   — 任务描述字符串（"Enrich concept: syntax/arrow_function"）
 *
 * 后置产物（输出）：
 *   返回值 string  — LLM 最后一轮的确认文字（通常可忽略）
 *   副作用         — writeConceptDocTool.fn 被调用，写入磁盘 .md 文件
 */

import OpenAI from "openai";

// ── 提供商配置表 ────────────────────────────────────────────────────────────

const PROVIDERS: Record<string, { baseURL: string; defaultModel: string }> = {
  deepseek: {
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
};

/** 工具定义：包含给 LLM 的描述（schema）+ 实际执行逻辑（fn） */
export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema 格式的参数描述，直接传给 OpenAI function calling */
  parameters: Record<string, unknown>;
  /** LLM 调用时执行的函数，返回值会序列化为 JSON 反馈给 LLM */
  fn: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

function buildClient(): { client: OpenAI; model: string } {
  const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  const apiKey = process.env.LLM_API_KEY ?? "";
  if (!apiKey) {
    throw new Error(
      "Missing LLM_API_KEY environment variable.\n" +
        "  DeepSeek: export LLM_API_KEY=sk-xxx  LLM_PROVIDER=deepseek\n" +
        "  Qwen:     export LLM_API_KEY=sk-xxx  LLM_PROVIDER=qwen\n" +
        "  OpenAI:   export LLM_API_KEY=sk-xxx  LLM_PROVIDER=openai"
    );
  }

  let baseURL: string;
  let model: string;

  if (provider === "custom") {
    baseURL = process.env.LLM_BASE_URL ?? "";
    if (!baseURL) throw new Error("LLM_BASE_URL is required when LLM_PROVIDER=custom");
    model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  } else {
    const cfg = PROVIDERS[provider] ?? PROVIDERS.deepseek;
    baseURL = process.env.LLM_BASE_URL ?? cfg.baseURL;
    model = process.env.LLM_MODEL ?? cfg.defaultModel;
  }

  const client = new OpenAI({ apiKey, baseURL });
  console.log(`[LLM] provider=${provider} model=${model}`);
  return { client, model };
}

// ── ToolCallRunner ──────────────────────────────────────────────────────────

export class ToolCallRunner {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;
  private toolMap: Map<string, ToolDef>;
  private schemas: OpenAI.ChatCompletionTool[];
  private maxRounds: number;

  constructor(
    systemPrompt: string,
    tools: ToolDef[],
    options: { maxRounds?: number } = {}
  ) {
    const { client, model } = buildClient();
    this.client = client;
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.maxRounds = options.maxRounds ?? 40;
    this.toolMap = new Map(tools.map((t) => [t.name, t]));
    this.schemas = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as OpenAI.FunctionDefinition["parameters"],
      },
    }));
  }

  /**
   * 运行一次完整的 ReAct 循环
   *
   * 前置产物: userMessage（任务描述字符串）
   * 后置产物:
   *   - 返回值 string：LLM 最后一轮确认文字
   *   - 副作用：工具函数（尤其是 writeConceptDoc）执行时写入磁盘
   */
  async run(userMessage: string): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userMessage },
    ];

    for (let round = 0; round < this.maxRounds; round++) {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: this.schemas.length > 0 ? this.schemas : undefined,
        tool_choice: this.schemas.length > 0 ? "auto" : undefined,
      });

      const msg = response.choices[0].message;
      // 把 assistant 消息追加进历史（保持上下文）
      messages.push(msg as OpenAI.ChatCompletionMessageParam);

      const toolCalls = msg.tool_calls ?? [];
      // 没有 tool_calls → LLM 完成任务，返回最终文字
      if (toolCalls.length === 0) {
        return msg.content ?? "";
      }

      // 逐一执行 tool_calls
      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }

        console.log(`  [tool→] ${fnName}(${compact(args)})`);

        const tool = this.toolMap.get(fnName);
        let result: unknown;
        if (!tool) {
          result = { error: `unknown tool: ${fnName}` };
        } else {
          try {
            result = await tool.fn(args);
          } catch (e) {
            result = { error: String(e) };
          }
        }

        console.log(`  [tool←] ${fnName}: ${compact(result)}`);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result, (_k, v) =>
            typeof v === "bigint" ? String(v) : v
          ),
        });
      }
    }

    console.warn(`[LLM] maxRounds=${this.maxRounds} reached, stopping`);
    return "";
  }
}

function compact(val: unknown, limit = 120): string {
  const s = JSON.stringify(val, (_k, v) =>
    typeof v === "bigint" ? String(v) : v
  ) ?? "";
  return s.length <= limit ? s : s.slice(0, limit) + "…";
}
