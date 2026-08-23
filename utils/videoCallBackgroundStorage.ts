import type { CharacterProfile } from '../types';
import { migrateDataUrlToRef } from './blobRef';

/**
 * 把角色视频舞台背景里的 data:image 重新落进统一 blob_assets 存储。
 * 完整备份/角色卡导入会先把 zip 图片恢复成 data URL；这里负责收口回 blobref。
 */
export async function migrateVideoCallBackgroundBlobRefs(
  character: CharacterProfile,
  cache: Map<string, string> = new Map(),
): Promise<{ character: CharacterProfile; migrated: boolean }> {
  let migrated = false;
  const migrate = async (value?: string): Promise<string | undefined> => {
    if (!value?.startsWith('data:image/')) return value;
    const cached = cache.get(value);
    if (cached) {
      migrated = true;
      return cached;
    }
    const stored = await migrateDataUrlToRef(value);
    cache.set(value, stored);
    if (stored !== value) migrated = true;
    return stored;
  };

  const videoCallBackground = await migrate(character.videoCallBackground);
  const sourceSchedule = character.videoCallBackgroundSchedule;
  let videoCallBackgroundSchedule = sourceSchedule;
  if (sourceSchedule) {
    videoCallBackgroundSchedule = { ...sourceSchedule };
    for (const key of Object.keys(videoCallBackgroundSchedule) as Array<keyof typeof videoCallBackgroundSchedule>) {
      videoCallBackgroundSchedule[key] = await migrate(videoCallBackgroundSchedule[key]);
    }
  }

  if (!migrated) return { character, migrated: false };
  return {
    migrated: true,
    character: { ...character, videoCallBackground, videoCallBackgroundSchedule },
  };
}
