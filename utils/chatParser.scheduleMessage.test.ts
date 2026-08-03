import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatParser } from './chatParser';
import { DB } from './db';

vi.mock('@capacitor/local-notifications', () => ({
    LocalNotifications: {
        checkPermissions: vi.fn(async () => ({ display: 'denied' })),
        schedule: vi.fn(),
    },
}));

const createdIds: number[] = [];

afterEach(async () => {
    if (createdIds.length) await DB.deleteMessages(createdIds.splice(0));
    vi.restoreAllMocks();
});

const noop = () => {};

const run = (content: string, charTz?: string) =>
    ChatParser.parseAndExecuteActions(content, `c-sched-${Date.now()}`, '阿一', noop, undefined, charTz);

describe('schedule_message receipts', () => {
    it('records a readable system receipt after scheduling a future message', async () => {
        const charId = `schedule-message-${Date.now()}`;
        const timeStr = '2099-01-02 08:30:00';
        const content = await ChatParser.parseAndExecuteActions(
            `晚点说\n[schedule_message | ${timeStr} | fixed | 早安，记得吃饭]`,
            charId,
            'Silis',
            vi.fn(),
        );

        const messages = await DB.getRecentMessagesByCharId(charId, 20, true);
        createdIds.push(...messages.map(message => message.id).filter((id): id is number => typeof id === 'number'));
        const receipt = messages.find(message => message.role === 'system' && message.content.includes('安排了定时消息'));

        expect(content).toBe('晚点说');
        expect(receipt?.content).toBe(`Silis 安排了定时消息 "早安，记得吃饭" (${timeStr})`);
    });
});

describe('[schedule_message] 排不上时留痕', () => {
    it('时间已经过去 → warn 一行 + 不落库', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
        const save = vi.spyOn(DB, 'saveScheduledMessage');

        const out = await run('睡吧\n[schedule_message | 2020-01-01 08:00:00 | fixed | 早安，起床啦]');

        expect(out).toBe('睡吧');
        expect(save).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        const line = warn.mock.calls[0].join(' ');
        expect(line).toContain('时间已经过去');
        expect(line).toContain('2020-01-01 08:00:00');
        expect(line).toContain('早安，起床啦');
    });

    it('时间解析不出来 → warn 一行 + 不落库', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
        const save = vi.spyOn(DB, 'saveScheduledMessage');

        const out = await run('好\n[schedule_message | 明天早上 | fixed | 起床啦]');

        expect(out).toBe('好');
        expect(save).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0].join(' ')).toContain('时间解析不了');
    });

    it('时间还没到 → 照常落库并写回执，不 warn', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
        const save = vi.spyOn(DB, 'saveScheduledMessage').mockResolvedValue(undefined as any);
        const charId = `c-future-${Date.now()}`;
        const future = new Date(Date.now() + 3600_000);
        const stamp = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${
            String(future.getDate()).padStart(2, '0')} ${String(future.getHours()).padStart(2, '0')}:${
            String(future.getMinutes()).padStart(2, '0')}:00`;

        const out = await ChatParser.parseAndExecuteActions(
            `好\n[schedule_message | ${stamp} | fixed | 该出门了]`,
            charId,
            '阿一',
            noop,
        );

        const messages = await DB.getRecentMessagesByCharId(charId, 20, true);
        createdIds.push(...messages.map(message => message.id).filter((id): id is number => typeof id === 'number'));
        expect(out).toBe('好');
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0][0]).toMatchObject({ content: '该出门了' });
        expect(messages.some(message => message.content.includes('安排了定时消息'))).toBe(true);
        expect(warn).not.toHaveBeenCalled();
    });
});

describe('parseAndExecuteActions 落库时间戳', () => {
    it('传了 messageTimestamp → 戳一戳 / 转账 / 日程系统提示全用同一个时刻', async () => {
        const charId = `c-ts-${Date.now()}`;
        const sentAt = Date.UTC(2026, 7, 2, 19, 0);

        await ChatParser.parseAndExecuteActions(
            '睡吧\n[[ACTION:POKE]]\n[[ACTION:TRANSFER:520]]\n[[ACTION:ADD_EVENT | 面试 | 2026-08-03]]',
            charId, '阿一', noop, undefined, undefined, sentAt,
        );

        const messages = await DB.getRecentMessagesByCharId(charId, 50);
        createdIds.push(...messages.map(message => message.id).filter((id): id is number => typeof id === 'number'));
        const stamped = messages.filter(message => message.type !== 'text' || message.role === 'system');
        expect(stamped.length).toBeGreaterThanOrEqual(3);
        for (const message of stamped) expect(message.timestamp).toBe(sentAt);
    }, 20000);

    it('不传 → 维持写库当刻', async () => {
        const charId = `c-ts-none-${Date.now()}`;
        const before = Date.now();
        await ChatParser.parseAndExecuteActions('[[ACTION:POKE]]', charId, '阿一', noop);

        const messages = await DB.getRecentMessagesByCharId(charId, 50);
        createdIds.push(...messages.map(message => message.id).filter((id): id is number => typeof id === 'number'));
        expect(messages).toHaveLength(1);
        expect(messages[0].timestamp).toBeGreaterThanOrEqual(before);
    }, 20000);
});
