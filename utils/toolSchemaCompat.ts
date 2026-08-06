/**
 * Some OpenAI-compatible relays forward Claude tool definitions directly to
 * Anthropic/Vertex. Convert only the request schema; responses are normalized
 * back to OpenAI tool_calls by safeApi.
 */
export const ensureClaudeToolSchema = <T extends Record<string, any>>(body: T): T => {
  if (!/claude/i.test(String(body.model || '')) || !Array.isArray(body.tools)) return body;

  body.tools = body.tools.map((tool: any) => {
    if (tool?.type !== 'function' || !tool.function?.name) return tool;
    return {
      name: tool.function.name,
      ...(tool.function.description ? { description: tool.function.description } : {}),
      input_schema: tool.function.parameters || { type: 'object', properties: {} },
    };
  });

  if (body.tool_choice === 'auto') body.tool_choice = { type: 'auto' };
  if (body.tool_choice === 'required') body.tool_choice = { type: 'any' };
  return body;
};
