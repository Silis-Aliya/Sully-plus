/**
 * 一起听生成租约。浏览器正在用既有 music-wake prompt 生成时持续续租，
 * AMSG worker 看见新鲜租约就跳过同一时刻的云端生成，避免同角色连续发两条。
 */

export const AMSG_MUSIC_WAKE_PRESENCE_KEY = 'music_wake_presence';
export const MUSIC_WAKE_PRESENCE_HEARTBEAT_MS = 15_000;
export const MUSIC_WAKE_PRESENCE_TTL_MS = 45_000;

export interface AmsgMusicWakePresence {
  v: 1;
  charId: string;
  activeAt: number;
}

export const parseAmsgMusicWakePresence = (
  raw: string | undefined,
): AmsgMusicWakePresence | null => {
  try {
    const value = raw ? JSON.parse(raw) : null;
    return value?.v === 1 && typeof value.charId === 'string' &&
      typeof value.activeAt === 'number'
      ? value as AmsgMusicWakePresence
      : null;
  } catch {
    return null;
  }
};

export const isFreshMusicWakePresence = (
  value: AmsgMusicWakePresence | null | undefined,
  charId: string,
  nowMs: number,
): boolean => Boolean(
  value && value.v === 1 && value.charId === charId &&
  value.activeAt <= nowMs + 10_000 && nowMs - value.activeAt <= MUSIC_WAKE_PRESENCE_TTL_MS,
);
