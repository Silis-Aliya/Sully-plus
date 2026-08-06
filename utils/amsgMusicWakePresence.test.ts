import { describe, expect, it } from 'vitest';
import {
  AmsgMusicWakePresence,
  MUSIC_WAKE_PRESENCE_TTL_MS,
  isFreshMusicWakePresence,
  parseAmsgMusicWakePresence,
} from './amsgMusicWakePresence';

const presence = (over: Partial<AmsgMusicWakePresence> = {}): AmsgMusicWakePresence => ({
  v: 1,
  charId: 'char-1',
  activeAt: 1_000_000,
  ...over,
});

describe('parseAmsgMusicWakePresence', () => {
  it('合法租约可以还原', () => {
    expect(parseAmsgMusicWakePresence(JSON.stringify(presence()))).toEqual(presence());
  });

  it('坏 JSON、版本或字段类型不对时返回 null', () => {
    expect(parseAmsgMusicWakePresence('{')).toBeNull();
    expect(parseAmsgMusicWakePresence(JSON.stringify({ ...presence(), v: 2 }))).toBeNull();
    expect(parseAmsgMusicWakePresence(JSON.stringify({ ...presence(), activeAt: 'x' }))).toBeNull();
  });
});

describe('isFreshMusicWakePresence', () => {
  const now = 2_000_000;

  it('同角色且未过期时有效', () => {
    expect(isFreshMusicWakePresence(presence({ activeAt: now - 1_000 }), 'char-1', now)).toBe(true);
  });

  it('不同角色、过期或未来偏移过大时无效', () => {
    expect(isFreshMusicWakePresence(presence({ activeAt: now - 1_000 }), 'char-2', now)).toBe(false);
    expect(isFreshMusicWakePresence(
      presence({ activeAt: now - MUSIC_WAKE_PRESENCE_TTL_MS - 1 }), 'char-1', now,
    )).toBe(false);
    expect(isFreshMusicWakePresence(presence({ activeAt: now + 10_001 }), 'char-1', now)).toBe(false);
  });
});
