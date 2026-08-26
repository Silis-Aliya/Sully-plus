import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('聊天最新图片加载契约', () => {
    const itemSource = readFileSync(path.resolve(__dirname, '../components/chat/MessageItem.tsx'), 'utf8');
    const chatSource = readFileSync(path.resolve(__dirname, '../apps/Chat.tsx'), 'utf8');

    it('使用前声明并解构 isLatestMessage', () => {
        expect(itemSource).toContain('isLatestMessage?: boolean;');
        expect(itemSource).toContain('isLatestMessage = false,');
        expect(itemSource).toContain("loading={isLatestMessage ? 'eager' : 'lazy'}");
    });

    it('聊天列表把窗口最后一条消息标记出来', () => {
        expect(chatSource).toContain('isLatestMessage={i === displayMessages.length - 1}');
    });
});
