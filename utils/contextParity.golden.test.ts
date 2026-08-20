import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../fixtures/context-parity-p0.json';
import gatesFixture from '../fixtures/context-parity-gates.json';
import { ContextBuilder } from './context';
import { injectWorldbookDepthEntries, resolveWorldbookEntries } from './worldbook';

const hash = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

describe('Context parity P0 golden fixture (SullyOS authority)', () => {
    afterEach(() => vi.useRealTimers());

    it('locks core ordering, activation, recall placement, final messages and state changes', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixture.now);
        const char = fixture.character as any;
        const user = fixture.userProfile as any;
        const inputsBefore = JSON.stringify({ char, user });
        const messages = fixture.messages as any[];
        const stable = ContextBuilder.buildCoreContext(char, user, true, undefined, undefined, { worldbookMessages: messages }, { deferVolatile: true });
        let volatile = `\n[System: 实时状态 (Live Context)]\n（以下是此刻的实时状态——当前时间、你正在做的事、你的情绪底色、周边动态。你的人设与聊天规则见最上方的系统设定，此处不再重复。）\n\n`;
        volatile += ContextBuilder.buildVolatileCoreState(char, { includeDetailedMemories: true, timeOptions: { lastInteractionTs: fixture.lastInteractionTs } });
        volatile += fixture.runtimeStateContext;
        volatile += fixture.recencyTail;
        const resolved = resolveWorldbookEntries(char.mountedWorldbooks, messages, char.name, user.name);
        const activatedWorldbooks = resolved.map(entry => ({ id: entry.book.id, position: entry.position, order: entry.order, content: entry.content }));
        const history = injectWorldbookDepthEntries(messages, resolved.filter(entry => entry.position === 4));
        const finalMessages = [{ role: 'system', content: stable }, ...history, { role: 'system', content: volatile }];

        expect(activatedWorldbooks.map(item => item.id)).toEqual([
            'wb-before', 'wb-after', 'wb-author-top', 'wb-author-bottom', 'wb-depth', 'wb-example-before', 'wb-example-after',
        ]);
        expect(stable.indexOf('世界书 · 角色设定前')).toBeLessThan(stable.indexOf('### 你的身份'));
        expect(stable.indexOf('### 世界观与设定')).toBeLessThan(stable.indexOf('扩展设定集'));
        expect(stable.indexOf('世界书 · 示例消息前')).toBeLessThan(stable.indexOf('世界书 · 示例消息后'));
        expect(stable.indexOf('Private Impression')).toBeLessThan(stable.indexOf('记忆宫殿·底色认知'));
        expect(stable).not.toContain('记忆宫殿召回');
        expect(volatile.indexOf('当前时间')).toBeLessThan(volatile.indexOf('记忆宫殿召回'));
        expect(volatile.indexOf('记忆宫殿召回')).toBeLessThan(volatile.indexOf('当前情绪底色'));
        expect(finalMessages).toContainEqual({ role: 'system', content: '收音机目前只有左声道。' });
        expect(fixture.recallResult.items.map(item => item.id)).toEqual(['memory-radio']);
        expect(fixture.stateChanges).toEqual([]);
        expect(JSON.stringify({ char, user })).toBe(inputsBefore);
        console.log(JSON.stringify({ stable: hash(stable), volatile: hash(volatile), activated: hash(activatedWorldbooks), recall: hash(fixture.recallResult), finalMessages: hash(finalMessages), modelConfig: hash(fixture.modelConfig), stateChanges: hash(fixture.stateChanges) }));
    });

    it('locks disabled-state gates, object impression changes and whole-word activation', () => {
        vi.useFakeTimers();
        vi.setSystemTime(gatesFixture.now);
        const char = gatesFixture.character as any;
        const user = gatesFixture.userProfile as any;
        const messages = gatesFixture.messages as any[];
        const stable = ContextBuilder.buildCoreContext(char, user, true, undefined, undefined, { worldbookMessages: messages }, { deferVolatile: true });
        let volatile = `\n[System: 实时状态 (Live Context)]\n（以下是此刻的实时状态——当前时间、你正在做的事、你的情绪底色、周边动态。你的人设与聊天规则见最上方的系统设定，此处不再重复。）\n\n`;
        volatile += ContextBuilder.buildVolatileCoreState(char, { includeDetailedMemories: true, timeOptions: { lastInteractionTs: gatesFixture.lastInteractionTs } });
        volatile += gatesFixture.runtimeStateContext;
        volatile += gatesFixture.recencyTail;
        const resolved = resolveWorldbookEntries(char.mountedWorldbooks, messages, char.name, user.name);
        const activatedWorldbooks = resolved.map(entry => ({ id: entry.book.id, position: entry.position, order: entry.order, content: entry.content }));
        const finalMessages = [{ role: 'system', content: stable }, ...injectWorldbookDepthEntries(messages, resolved.filter(entry => entry.position === 4)), { role: 'system', content: volatile }];
        const hashes = { stable: hash(stable), volatile: hash(volatile), activated: hash(activatedWorldbooks), recall: hash(gatesFixture.recallResult), finalMessages: hash(finalMessages), modelConfig: hash(gatesFixture.modelConfig), stateChanges: hash(gatesFixture.stateChanges) };

        expect(activatedWorldbooks.map(item => item.id)).toEqual(['wb-whole']);
        expect(stable).toContain('[2026-08] 开始主动说明不确定性');
        expect(`${stable}\n${volatile}`).not.toContain('STALE_ROOM_PLATE_MUST_NOT_APPEAR');
        expect(`${stable}\n${volatile}`).not.toContain('STALE_RECALL_MUST_NOT_APPEAR');
        expect(`${stable}\n${volatile}`).not.toContain('STALE_BUFF_MUST_NOT_APPEAR');
        expect(volatile).not.toContain('当前时间 (Now)');
        console.log(`CONTEXT_PARITY_GATES=${JSON.stringify(hashes)}`);
    });
});
