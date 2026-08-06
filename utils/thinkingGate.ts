/**
 * 思考链参数（thinking / reasoning_effort）能不能和 tools 一起发。
 *
 * 背景：Gemini 兼容层收到 thinking 参数 + tools 会直接 400 INVALID_ARGUMENT，
 * 表现是「开了思考链的角色一用工具就报错，换个没开思考链的角色就好」。
 *
 * 两类工具的处理不一样：
 *  - 小程序点单 / 瑞幸聊天 / 通用 MCP：用户主动进入的模式，一律思考链让步（既有惯例，
 *    只影响这一轮对话）。
 *  - 主动消息 2.0：配了 worker 就常驻在每一轮请求里。要是也一刀切让步，等于所有配过
 *    worker 的角色永久失去思考链——代价比偶发 400 大得多。所以只对真会打回的渠道让步。
 */

/**
 * 这个渠道会不会因为「thinking + tools 同发」打回请求。
 * 目前只有 Gemini 系确认会（含各种带前缀的中转名，如 google/gemini-2.0-flash）。
 * 以后发现别的渠道也炸，往这里加就行。
 */
export const modelRejectsThinkingWithTools = (model: string): boolean =>
  /gemini/i.test(model || '');

export const shouldSendThinkingParams = (input: {
  /** 用户在角色设置里开的「思考过程展示」。 */
  thinkingActive: boolean;
  /** 小程序 / 瑞幸聊天 / 通用 MCP 这类用户主动进入的工具模式。 */
  legacyToolModeActive: boolean;
  /** 本轮是否注入了主动消息 2.0 的排程工具。 */
  amsg2ToolsInjected: boolean;
  model: string;
}): boolean => {
  if (!input.thinkingActive) return false;
  if (input.legacyToolModeActive) return false;
  if (input.amsg2ToolsInjected && modelRejectsThinkingWithTools(input.model)) return false;
  return true;
};

export const CLAUDE_TOOL_MIN_THINKING_BUDGET = 1024;

/**
 * 部分 Claude 中转在 thinking 型号携带 tools、但请求未显式给 thinking 时，会错误地
 * 推导出 budget=16，随后被 Anthropic 的最小 1024 校验拒绝。只为这个组合补最低合法值。
 */
export const ensureClaudeToolThinkingBudget = <T extends Record<string, any>>(body: T): T => {
  if (!Array.isArray(body.tools) || body.tools.length === 0) return body;
  if (!/claude.*thinking/i.test(String(body.model || ''))) return body;

  const existingBudget = Number(body.thinking?.budget_tokens);
  if (body.thinking?.type === 'enabled'
      && Number.isFinite(existingBudget)
      && existingBudget >= CLAUDE_TOOL_MIN_THINKING_BUDGET) return body;

  body.thinking = { type: 'enabled', budget_tokens: CLAUDE_TOOL_MIN_THINKING_BUDGET };
  body.extra_body = {
    ...(body.extra_body || {}),
    thinking: { type: 'enabled', budget_tokens: CLAUDE_TOOL_MIN_THINKING_BUDGET },
  };
  delete body.temperature;
  delete body.top_p;
  return body;
};
