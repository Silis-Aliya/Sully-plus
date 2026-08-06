import { describe, expect, it } from 'vitest';
import { getXhsNoteOpenUrl } from './xhsOpenUrl';

describe('getXhsNoteOpenUrl', () => {
    it('prefers the persisted source URL', () => {
        expect(getXhsNoteOpenUrl({
            noteId: 'note-1',
            sourceUrl: 'https://www.xiaohongshu.com/explore/source-note',
        })).toBe('https://www.xiaohongshu.com/explore/source-note');
    });

    it('builds a URL from an autonomous-wake note payload', () => {
        expect(getXhsNoteOpenUrl({
            noteId: 'note-2',
            xsecToken: 'token with spaces',
        })).toBe('https://www.xiaohongshu.com/explore/note-2?xsec_token=token%20with%20spaces&xsec_source=pc_feed');
    });

    it('accepts legacy payloads that stored a share URL in noteId', () => {
        expect(getXhsNoteOpenUrl({
            noteId: 'https://xhslink.com/a/abc123',
        })).toBe('https://xhslink.com/a/abc123');
    });

    it('does not create a link without a usable locator', () => {
        expect(getXhsNoteOpenUrl({ title: 'only a title' })).toBe('');
    });
});
