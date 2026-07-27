import { describe, expect, it } from 'vitest';
import { resolveXhsShareLink } from './xhsShareLink';

describe('resolveXhsShareLink', () => {
    it('builds the same structured share for Chat and Code from a full note link', async () => {
        const noteId = '64f123456789abcdef012345';
        const result = await resolveXhsShareLink(
            `【夜晚散步 | 小红书】https://www.xiaohongshu.com/explore/${noteId}?xsec_token=token123`,
        );

        expect(result.detected).toBe(true);
        expect(result.note).toMatchObject({
            noteId,
            title: '夜晚散步',
            xsecToken: 'token123',
        });
        expect(result.note?.sourceUrl).toContain(noteId);
    });

    it('does not pretend an unrelated link is an XHS card', async () => {
        const result = await resolveXhsShareLink('https://example.com/article');

        expect(result).toEqual({
            detected: false,
            note: null,
            detailLoaded: false,
        });
    });

    it('does not use the app name as the card title', async () => {
        const noteId = '64f123456789abcdef012345';
        const result = await resolveXhsShareLink(
            `【小红书】https://www.xiaohongshu.com/explore/${noteId}`,
        );

        expect(result.detected).toBe(true);
        expect(result.note?.title).toBe('');
    });

    it('uses the text before the share url as a title fallback', async () => {
        const noteId = '64f123456789abcdef012345';
        const result = await resolveXhsShareLink(
            `AI 声音怎么做出呼吸感？ ElevenLabs 标签自主创造和可复用分享 https://www.xiaohongshu.com/explore/${noteId}`,
        );

        expect(result.detected).toBe(true);
        expect(result.note?.title).toBe('AI 声音怎么做出呼吸感？ ElevenLabs 标签自主创造和可复用分享');
    });
});
