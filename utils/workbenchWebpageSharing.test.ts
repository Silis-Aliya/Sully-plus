import { describe, expect, it } from 'vitest';
import { findWorkbenchWebpageUrls } from '../apps/WorkbenchApp';
import { workbenchContentForContext } from './workbenchBridge';

describe('Workbench webpage sharing', () => {
    it('keeps ordinary webpage URLs in source order and excludes XHS URLs', () => {
        expect(findWorkbenchWebpageUrls(
            '先看 https://example.com/a 再看 https://github.com/org/repo，最后 https://xhslink.com/a',
        )).toEqual([
            'https://example.com/a',
            'https://github.com/org/repo',
        ]);
    });

    it('does not duplicate a share comment already persisted as a text bubble', () => {
        const content = workbenchContentForContext({
            id: 'card-1',
            sessionId: 'session-1',
            role: 'user',
            type: 'webpage_card',
            kind: 'chat',
            mode: 'codex',
            content: 'Example',
            createdAt: 1,
            metadata: {
                webpage: {
                    url: 'https://example.com',
                    title: 'Example',
                    content: 'Page body',
                },
                shareComment: '你看看这个',
                shareCommentPersistedAsMessage: true,
            },
        });

        expect(content).not.toContain('你看看这个');
        expect(content).toContain('Page body');
    });

    it('keeps historical card-only share comments readable', () => {
        const content = workbenchContentForContext({
            id: 'legacy-card',
            sessionId: 'session-1',
            role: 'user',
            type: 'webpage_card',
            kind: 'chat',
            mode: 'codex',
            content: 'Example',
            createdAt: 1,
            metadata: {
                webpage: { url: 'https://example.com', title: 'Example' },
                shareComment: '旧卡片附言',
            },
        });

        expect(content).toContain('旧卡片附言');
    });
});
