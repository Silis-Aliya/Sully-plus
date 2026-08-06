import { describe, expect, it } from 'vitest';

import { ensureClaudeToolSchema } from './toolSchemaCompat';

describe('ensureClaudeToolSchema', () => {
  const openAiTool = {
    type: 'function',
    function: {
      name: 'schedule_active_message',
      description: 'Schedule a message',
      parameters: { type: 'object', properties: { send_at: { type: 'string' } } },
    },
  };

  it('converts OpenAI function tools for Claude relays', () => {
    const body: any = {
      model: '小E-claude-opus-4-6',
      tools: [openAiTool],
      tool_choice: 'auto',
    };

    expect(ensureClaudeToolSchema(body)).toBe(body);
    expect(body.tools).toEqual([{
      name: 'schedule_active_message',
      description: 'Schedule a message',
      input_schema: openAiTool.function.parameters,
    }]);
    expect(body.tool_choice).toEqual({ type: 'auto' });
  });

  it('leaves non-Claude requests unchanged', () => {
    const body: any = { model: 'gpt-4.1', tools: [openAiTool], tool_choice: 'auto' };
    ensureClaudeToolSchema(body);
    expect(body).toEqual({ model: 'gpt-4.1', tools: [openAiTool], tool_choice: 'auto' });
  });

  it('keeps tools that are already in Anthropic format', () => {
    const tool = { name: 'list_active_messages', input_schema: { type: 'object' } };
    const body: any = { model: 'claude-opus-4-6', tools: [tool], tool_choice: { type: 'auto' } };
    ensureClaudeToolSchema(body);
    expect(body.tools).toEqual([tool]);
  });
});
