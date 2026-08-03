import type { WorkbenchArtifact, WorkbenchMessage } from '../types';

type ForwardMessageType = 'text' | 'image' | 'emoji';

export interface WorkbenchForwardMessage {
    role: 'user' | 'assistant';
    type: ForwardMessageType;
    content: string;
    displayContent?: string;
    senderName: string;
    timestamp: number;
}

export interface WorkbenchForwardData {
    fromUserName: string;
    fromCharName: string;
    source: 'workbench';
    sourceLabel: string;
    sessionTitle: string;
    count: number;
    preview: string[];
    messages: WorkbenchForwardMessage[];
}

const messageSenderName = (message: WorkbenchMessage, userName: string): string => {
    if (message.role === 'user') return userName;
    if (message.role === 'character' || message.role === 'sully') {
        return String(message.metadata?.speakerName || '角色');
    }
    if (message.role === 'system' || message.kind === 'error') return 'System';
    return String(message.metadata?.speakerName || message.metadata?.displayName || 'Codex');
};

const messageText = (message: WorkbenchMessage): string => {
    const webpage = message.type === 'webpage_card' ? message.metadata?.webpage : null;
    if (webpage) {
        return [
            `网页：${webpage.title || message.content || '未命名网页'}`,
            webpage.siteName ? `来源：${webpage.siteName}` : '',
            webpage.excerpt ? `摘要：${webpage.excerpt}` : '',
            webpage.finalUrl || webpage.url || '',
        ].filter(Boolean).join('\n');
    }

    const note = message.metadata?.xhsNote;
    if (note) {
        return [
            `小红书笔记：${note.title || message.content || '未命名笔记'}`,
            note.author ? `作者：${note.author}` : '',
            note.desc ? `正文：${note.desc}` : '',
            note.sourceUrl || note.url || '',
        ].filter(Boolean).join('\n');
    }

    const artifact = message.type === 'file' ? message.metadata?.artifact as WorkbenchArtifact | undefined : undefined;
    if (artifact) {
        return [
            `文件：${artifact.name}`,
            artifact.relativePath ? `路径：${artifact.relativePath}` : '',
            artifact.mimeType ? `类型：${artifact.mimeType}` : '',
            typeof artifact.textContent === 'string'
                ? `正文：\n${artifact.textContent}`
                : artifact.preview ? `预览：\n${artifact.preview}` : '',
        ].filter(Boolean).join('\n');
    }

    if (message.kind === 'error') return `SYSTEM ERROR：${message.content}`;
    return message.content || '';
};

const normalizeMessage = (message: WorkbenchMessage, userName: string): WorkbenchForwardMessage => {
    const senderName = messageSenderName(message, userName);
    if (message.type === 'image' || message.type === 'emoji') {
        return {
            role: message.role === 'user' ? 'user' : 'assistant',
            type: message.type,
            content: message.content,
            senderName,
            timestamp: message.createdAt,
        };
    }

    const displayContent = messageText(message);
    return {
        role: message.role === 'user' ? 'user' : 'assistant',
        type: 'text',
        content: message.role === 'user' ? displayContent : `[${senderName}] ${displayContent}`,
        displayContent,
        senderName,
        timestamp: message.createdAt,
    };
};

export const buildWorkbenchForwardData = (
    selectedMessages: WorkbenchMessage[],
    userName: string,
    sessionTitle: string,
): WorkbenchForwardData => {
    const messages = [...selectedMessages]
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(message => normalizeMessage(message, userName));
    const preview = messages.slice(0, 4).map(message => {
        const content = message.type === 'image'
            ? '[图片]'
            : message.type === 'emoji'
                ? '[表情]'
                : (message.displayContent || message.content).replace(/\s+/g, ' ').trim();
        return `${message.senderName}: ${content.slice(0, 40)}`;
    });
    if (messages.length > 4) preview.push(`... 共 ${messages.length} 条消息`);

    return {
        fromUserName: userName,
        fromCharName: 'Code 区',
        source: 'workbench',
        sourceLabel: 'Code 区记录',
        sessionTitle,
        count: messages.length,
        preview,
        messages,
    };
};
