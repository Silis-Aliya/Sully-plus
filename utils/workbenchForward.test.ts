import { describe, expect, it } from 'vitest';
import type { WorkbenchMessage } from '../types';
import { buildWorkbenchForwardData } from './workbenchForward';

const message = (input: Partial<WorkbenchMessage> & Pick<WorkbenchMessage, 'id' | 'role' | 'content' | 'createdAt'>): WorkbenchMessage => ({
    sessionId: 'code-session',
    mode: 'codex',
    type: 'text',
    kind: 'chat',
    ...input,
});

describe('Code records forwarded to chat', () => {
    it('marks the card as coming from Code and preserves speaker names', () => {
        const data = buildWorkbenchForwardData([
            message({ id: '2', role: 'codex', content: '检查完成', createdAt: 20 }),
            message({ id: '1', role: 'user', content: '检查项目', createdAt: 10 }),
            message({
                id: '3',
                role: 'character',
                content: '我也看到了',
                createdAt: 30,
                metadata: { speakerName: 'Silis' },
            }),
        ], 'Sully', '上游维护');

        expect(data).toMatchObject({
            source: 'workbench',
            sourceLabel: 'Code 区记录',
            fromCharName: 'Code 区',
            sessionTitle: '上游维护',
            count: 3,
        });
        expect(data.messages.map(item => item.senderName)).toEqual(['Sully', 'Codex', 'Silis']);
        expect(data.messages[1]).toMatchObject({
            role: 'assistant',
            content: '[Codex] 检查完成',
            displayContent: '检查完成',
        });
        expect(data.preview[0]).toContain('Sully: 检查项目');
    });

    it('turns Code-only cards and files into readable chat-forward text', () => {
        const data = buildWorkbenchForwardData([
            message({
                id: 'web',
                role: 'user',
                type: 'webpage_card',
                content: '教程',
                createdAt: 10,
                metadata: { webpage: { title: '部署教程', excerpt: '操作步骤', finalUrl: 'https://example.com/guide' } },
            }),
            message({
                id: 'file',
                role: 'codex',
                type: 'file',
                content: 'notes.md',
                createdAt: 20,
                metadata: { artifact: { name: 'notes.md', mimeType: 'text/markdown', textContent: '# Notes' } },
            }),
        ], '用户', '资料整理');

        expect(data.messages[0].content).toContain('网页：部署教程');
        expect(data.messages[0].content).toContain('https://example.com/guide');
        expect(data.messages[1].content).toContain('[Codex] 文件：notes.md');
        expect(data.messages[1].content).toContain('# Notes');
    });
});
