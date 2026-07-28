import { describe, expect, it } from 'vitest';
import { ChatPrompts } from './chatPrompts';

const char = { id: 'c1', name: 'Silis' } as any;
const userProfile = { name: 'Owner' } as any;

describe('buildMessageHistory voice cloud metadata', () => {
    it('passes Tencent mismatch and Xfyun voice profile to the character context together', () => {
        const messages = [{
            id: 1,
            charId: 'c1',
            role: 'user',
            type: 'voice',
            content: '\u6211\u8bd5\u4e00\u4e0b\u8bed\u97f3',
            timestamp: Date.now(),
            metadata: {
                voice: {
                    transcript: '\u6211\u8bd5\u4e00\u4e0b\u8bed\u97f3',
                    toneProvider: 'local-rules',
                    speakerVerification: { status: 'unmatched' },
                    voiceProfile: { gender: 'male', age: 'middle' },
                },
            },
        }] as any[];

        const { apiMessages } = ChatPrompts.buildMessageHistory(messages, 10, char, userProfile, []);
        const content = String(apiMessages[0]?.content || '');

        expect(content).toContain('\u5f53\u524d\u53ef\u80fd\u4e0d\u662f\uff08Owner\uff09');
        expect(content).toContain('\u58f0\u97f3\u504f\u7537\u58f0\uff0c\u4e2d\u9752\u5e74\u542c\u611f');
    });
});
