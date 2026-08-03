import { describe, expect, it } from 'vitest';
import { normalizeChatCompletionResponse, safeResponseJson } from './safeApi';

const vertexEnvelope = {
    response: {
        candidates: [{
            content: {
                role: 'model',
                parts: [{
                    functionCall: {
                        name: 'list_active_messages',
                        args: {},
                        id: 'toolu_vrtx_01',
                    },
                }],
            },
            finishReason: 'STOP',
        }],
        modelVersion: 'vertex-claude',
    },
};

describe('Vertex/Gemini functionCall normalization', () => {
    it('normalizes a top-level Vertex envelope into OpenAI tool_calls', async () => {
        const data = await safeResponseJson(new Response(JSON.stringify(vertexEnvelope), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const message = data.choices[0].message;
        expect(message.content).toBe('');
        expect(message.tool_calls).toEqual([{
            id: 'toolu_vrtx_01',
            type: 'function',
            function: { name: 'list_active_messages', arguments: '{}' },
        }]);
    });

    it('unwraps a Vertex envelope string leaked into OpenAI message.content', () => {
        const data = normalizeChatCompletionResponse({
            id: 'relay-response',
            choices: [{ message: { role: 'assistant', content: JSON.stringify(vertexEnvelope, null, 2) } }],
        });

        expect(data.id).toBe('relay-response');
        expect(data.choices[0].message.content).toBe('');
        expect(data.choices[0].message.tool_calls[0].function.name).toBe('list_active_messages');
        expect(data.choices[0].message.tool_calls[0].function.arguments).toBe('{}');
    });

    it('preserves ordinary OpenAI content unchanged', () => {
        const original = {
            choices: [{ message: { role: 'assistant', content: '正常回复' }, finish_reason: 'stop' }],
        };
        expect(normalizeChatCompletionResponse(original)).toBe(original);
    });
});
