import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Chat 空角色渲染的 Hook 顺序', () => {
    it('空态早退后不再声明 React Hook', () => {
        const source = readFileSync(new URL('../apps/Chat.tsx', import.meta.url), 'utf8');
        const emptyState = source.indexOf('if (!char) {');

        expect(emptyState).toBeGreaterThan(-1);

        const afterEmptyState = source.slice(emptyState);
        expect(afterEmptyState).not.toMatch(/\b(?:React\.)?use(?:State|Effect|LayoutEffect|Memo|Callback|Ref)\s*\(/);
        expect(afterEmptyState).not.toMatch(/\buseBlobRefUrl\s*\(/);
    });

    it('协同安装与模型选择所需能力均从对应 Context 取出', () => {
        const source = readFileSync(new URL('../apps/Chat.tsx', import.meta.url), 'utf8');

        expect(source).toContain('setActiveCharacterId, addCharacter, updateCharacter');
        expect(source).toContain('characterGroups, addWorldbook');
        expect(source).toContain('customThemes, addCustomTheme, removeCustomTheme');
        expect(source).toContain('updateTheme, saveAppearancePreset');
        expect(source).toContain('addApiPreset, availableModels, realtimeConfig');
    });
});
