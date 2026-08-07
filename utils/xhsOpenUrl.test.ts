import { describe, expect, it } from 'vitest';
import { getXhsNoteOpenUrl } from './xhsOpenUrl';

describe('getXhsNoteOpenUrl', () => {
    it('keeps the original share URL and its access token', () => {
        expect(getXhsNoteOpenUrl({ source_url: 'https://www.xiaohongshu.com/explore/exact-note?xsec_token=share-token&xsec_source=app_share' }))
            .toBe('https://www.xiaohongshu.com/explore/exact-note?xsec_token=share-token&xsec_source=app_share');
    });

    it('opens legacy cards whose note id is already a share URL', () => {
        expect(getXhsNoteOpenUrl({ noteId: 'www.rednote.com/explore/exact-note?xsec_token=token' }))
            .toBe('https://www.rednote.com/explore/exact-note?xsec_token=token');
    });

    it('builds the canonical URL from an id and token', () => {
        expect(getXhsNoteOpenUrl({ noteId: 'note id', xsec_token: 'token with spaces' }))
            .toBe('https://www.xiaohongshu.com/explore/note%20id?xsec_token=token%20with%20spaces&xsec_source=pc_feed');
    });
});
