import { describe, expect, it } from 'vitest';
import type { WorkbenchMessage } from '../types';
import { workbenchContentForContext } from './workbenchBridge';
import {
    isWorkbenchTextFile,
    prepareWorkbenchTextFiles,
    WORKBENCH_TEXT_FILE_MAX_BYTES,
} from './workbenchFileUpload';

const mockFile = (
    name: string,
    content: string,
    type = '',
    size = new TextEncoder().encode(content).byteLength,
): File => ({
    name,
    type,
    size,
    text: async () => content,
} as File);

describe('Workbench text file upload', () => {
    it('accepts common text and code filenames on mobile browsers', () => {
        expect(isWorkbenchTextFile(mockFile('notes.md', '# Notes'))).toBe(true);
        expect(isWorkbenchTextFile(mockFile('component.tsx', 'export default null'))).toBe(true);
        expect(isWorkbenchTextFile(mockFile('Dockerfile', 'FROM node:20'))).toBe(true);
        expect(isWorkbenchTextFile(mockFile('photo.png', 'binary', 'image/png'))).toBe(false);
    });

    it('keeps the complete text instead of silently truncating it', async () => {
        const content = `\uFEFF# Guide\n${'const value = 1;\n'.repeat(100)}`;
        const [prepared] = await prepareWorkbenchTextFiles([mockFile('guide.md', content, 'text/markdown')]);

        expect(prepared.textContent).toBe(content.slice(1));
        expect(prepared.textContent.length).toBeGreaterThan(prepared.preview.length);
        expect(prepared.preview).toBe(prepared.textContent.slice(0, 1200));
    });

    it('rejects oversized and binary-looking files rather than sending partial content', async () => {
        await expect(prepareWorkbenchTextFiles([
            mockFile('huge.txt', 'content', 'text/plain', WORKBENCH_TEXT_FILE_MAX_BYTES + 1),
        ])).rejects.toThrow('超过 64 KB');
        await expect(prepareWorkbenchTextFiles([
            mockFile('bad.txt', 'hello\0world', 'text/plain'),
        ])).rejects.toThrow('二进制文件');
    });

    it('serializes the full uploaded file for both assistant and character context paths', () => {
        const message: WorkbenchMessage = {
            id: 'file-message',
            sessionId: 'session',
            role: 'user',
            type: 'file',
            kind: 'chat',
            mode: 'codex',
            content: 'example.ts',
            createdAt: 1,
            metadata: {
                artifact: {
                    id: 'artifact',
                    sessionId: 'session',
                    name: 'example.ts',
                    mimeType: 'text/typescript',
                    size: 42,
                    preview: 'export const answer = 42;',
                    textContent: 'export const answer = 42;\n// complete file',
                    storageKind: 'inline',
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        };

        const context = workbenchContentForContext(message);
        expect(context).toContain('文件名：example.ts');
        expect(context).toContain('export const answer = 42;\n// complete file');
        expect(context).toContain('正文结束');
    });
});
