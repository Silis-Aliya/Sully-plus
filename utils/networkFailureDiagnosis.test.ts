import { describe, expect, it } from 'vitest';
import { diagnoseStoryRequestFailure } from './networkFailureDiagnosis';

describe('diagnoseStoryRequestFailure', () => {
    it('labels the report as story-only and does not echo request text', () => {
        const result = diagnoseStoryRequestFailure({ url: 'https://api.example.com/chat/completions', durationMs: 900, error: new TypeError('Load failed'), messageCount: 12, bodyChars: 3456 });
        expect(result).toContain('剧情请求诊断');
        expect(result).toContain('12 条上下文');
        expect(result).toContain('CORS');
        expect(result).not.toContain('Authorization');
    });
});
