import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import MessageItem from '../components/chat/MessageItem';
import type { Message } from '../types';

const renderXhsCard = (xhsNote: Record<string, unknown>) => renderToStaticMarkup(
    React.createElement(MessageItem, {
        msg: {
            id: 1,
            charId: 'char-1',
            role: 'assistant',
            type: 'xhs_card',
            content: 'A note',
            timestamp: 1,
            metadata: { source: 'active_msg_2', xhsNote },
        } as Message,
        isFirstInGroup: true,
        isLastInGroup: true,
        activeTheme: { id: 'test', name: 'Test', user: {}, ai: {} } as any,
        charAvatar: 'https://example.com/char.png',
        charName: 'Character',
        userAvatar: 'https://example.com/user.png',
        onLongPress: vi.fn(),
        onReply: vi.fn(),
        selectionMode: false,
        isSelected: false,
        onToggleSelect: vi.fn(),
        avatarMode: 'every_message',
        moduleAlign: 'center',
    }),
);

describe('MessageItem XHS links', () => {
    it('renders an autonomous-wake card as a native external link', () => {
        const markup = renderXhsCard({
            noteId: '64f123456789abcdef012345',
            xsecToken: 'wake-token',
            title: 'A note',
            desc: '',
            author: 'Author',
            likes: 1,
        });

        expect(markup).toContain('<a href="https://www.xiaohongshu.com/explore/64f123456789abcdef012345?xsec_token=wake-token&amp;xsec_source=pc_feed"');
        expect(markup).toContain('target="_blank"');
        expect(markup).toContain('rel="noopener noreferrer"');
    });

    it('does not pretend a locator-less card is clickable', () => {
        const markup = renderXhsCard({ title: 'A note', desc: '', author: '', likes: 0 });
        expect(markup).not.toContain('<a href=');
        expect(markup).toContain('aria-disabled="true"');
    });
});
