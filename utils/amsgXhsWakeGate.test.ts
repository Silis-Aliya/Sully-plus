import { describe, expect, it } from 'vitest';
import {
  AMSG_XHS_WAKE_CHANCE,
  parseAmsgXhsWakeGateState,
  resolveAmsgXhsWakeGate,
  stripLegacySwitchFirePackXhs,
  stripUnavailableAmsgXhsDirectives,
} from './amsgXhsWakeGate';

describe('AMSG XHS 唤醒概率门', () => {
  it('低于 50% 时开放，高于或等于 50% 时关闭', () => {
    expect(resolveAmsgXhsWakeGate(null, 'char-1', 1000, AMSG_XHS_WAKE_CHANCE - 0.01).eligible).toBe(true);
    expect(resolveAmsgXhsWakeGate(null, 'char-1', 1000, AMSG_XHS_WAKE_CHANCE).eligible).toBe(false);
  });

  it('上一次开放后，下一次强制关闭，避免连续两次出现', () => {
    const previous = { v: 1 as const, occurrenceMs: 1000, eligible: true };
    expect(resolveAmsgXhsWakeGate(previous, 'char-1', 2000, 0).eligible).toBe(false);
  });

  it('同一次唤醒重试复用原结果，不重新抽取', () => {
    const previous = { v: 1 as const, occurrenceMs: 1000, eligible: false };
    const result = resolveAmsgXhsWakeGate(previous, 'char-1', 1000, 0);
    expect(result).toEqual({ eligible: false, state: previous, reused: true });
  });

  it('坏状态按不存在处理', () => {
    expect(parseAmsgXhsWakeGateState('{bad')).toBeNull();
    expect(parseAmsgXhsWakeGateState('{"v":1,"occurrenceMs":1000,"eligible":true}'))
      .toEqual({ v: 1, occurrenceMs: 1000, eligible: true });
  });

  it('未开放时剥掉全部 XHS 隐藏标签并保留正文', () => {
    expect(stripUnavailableAmsgXhsDirectives([
      '忽然还是更想直接和你说话。',
      '[[xhs_browse]]',
      '[[XHS_SEARCH: 猫]]',
      '[[XHS_DETAIL: note-1]]',
      '[[XHS_SHARE: 2]]',
      '[[XHS_COMMENT: note-1 | 好可爱]]',
    ].join('\n'))).toBe('忽然还是更想直接和你说话。');
  });

  it('只有残留 XHS 标签时清成空串', () => {
    expect(stripUnavailableAmsgXhsDirectives('[[XHS_BROWSE]]')).toBe('');
  });

  it('清掉旧 fire_pack 的 XHS 能力段并保留前后设定', () => {
    const oldPrompt = [
      '【角色系统设定】',
      '这是角色设定。',
      '9. **📕 小红书（你的社交账号）**:',
      '你可以自由搜索和浏览。',
      '[[XHS_BROWSE]]',
      '**📖 查看笔记详情:**',
      '[[XHS_DETAIL: noteId]]',
      '10. **天气能力**:',
      '你可以查看天气。',
      '（注意：上面角色设定里的状态是快照。）',
      '【最近对话上下文】',
    ].join('\n');

    const cleaned = stripLegacySwitchFirePackXhs(oldPrompt);
    expect(cleaned).toContain('这是角色设定。');
    expect(cleaned).toContain('10. **天气能力**:');
    expect(cleaned).toContain('【最近对话上下文】');
    expect(cleaned).not.toContain('小红书');
    expect(cleaned).not.toContain('XHS_');
  });

  it('清掉旧版 Switch 总则里的常驻小红书措辞', () => {
    expect(stripLegacySwitchFirePackXhs('角色设定里描述的查记忆、读日记、联网搜索、逛小红书等能力照常可用。'))
      .toBe('角色设定里描述的查记忆、读日记、联网搜索等能力照常可用。');
  });
});
