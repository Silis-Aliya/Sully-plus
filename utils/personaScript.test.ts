import { describe, expect, it } from 'vitest';
import { normalizePersonaScript, parsePersonaScript } from './personaScript';

describe('persona script parsing', () => {
    it('parses fenced JSON and removes trailing commas outside strings', () => {
        const parsed = parsePersonaScript(`\`\`\`json
        {
          "beats": [
            {"kind":"thought","monologue":"comma, stays",},
            {"kind":"end",},
          ],
        }
        \`\`\``);

        expect(parsed?.beats).toHaveLength(2);
        expect(parsed?.beats[0]).toMatchObject({
            kind: 'thought',
            monologue: 'comma, stays',
        });
        expect(parsed?.beats[1].kind).toBe('end');
    });

    it('repairs raw control characters inside JSON strings', () => {
        const parsed = parsePersonaScript(
            '{"beats":[{"kind":"thought","monologue":"line one\nline two\tend"},{"kind":"end"}]}',
        );

        expect(parsed?.beats[0].monologue).toBe('line one\nline two\tend');
    });

    it('normalizes missing nested arrays used by app renderers', () => {
        const script = {
            beats: [
                { kind: 'app', app: { name: '微信', view: 'chat', chat: { name: 'A' } } },
                { kind: 'app', app: { name: '搜索', view: 'search', search: {} } },
                { kind: 'app', app: { name: '备忘录', view: 'notes', notes: { title: 'T' } } },
                { kind: 'app', app: { name: '浏览器', view: 'browser', browser: {} } },
                { kind: 'app', app: { name: '微信', view: 'compose', compose: { to: 'A' } } },
                { kind: 'end' },
            ],
        } as any;

        const normalized = normalizePersonaScript(script);
        expect(normalized.beats[0].app?.chat?.lines).toEqual([]);
        expect(normalized.beats[1].app?.search?.queries).toEqual([]);
        expect(normalized.beats[2].app?.notes?.items).toEqual([]);
        expect(normalized.beats[3].app?.browser?.tabs).toEqual([]);
        expect(normalized.beats[4].app?.compose?.drafts).toEqual([]);
    });

    it('returns null for empty, truncated, or non-JSON output', () => {
        expect(parsePersonaScript('')).toBeNull();
        expect(parsePersonaScript('{"beats":[')).toBeNull();
        expect(parsePersonaScript('model refused')).toBeNull();
    });
});
