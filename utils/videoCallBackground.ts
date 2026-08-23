import type { CharacterProfile } from '../types';
import { nowInTimeZone, resolveCharTimeZone } from './timezone';

export type VideoCallBackgroundPeriod = 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'night';
export type VideoCallBackgroundSegmentCount = 3 | 4 | 5 | 6;

export interface VideoCallBackgroundPeriodDefinition {
  id: VideoCallBackgroundPeriod;
  label: string;
  range: string;
  startHour: number;
  endHour: number;
}

export const VIDEO_CALL_BACKGROUND_PRESETS: Record<VideoCallBackgroundSegmentCount, VideoCallBackgroundPeriodDefinition[]> = {
  3: [
    { id: 'morning', label: '早上', range: '05:00–11:59', startHour: 5, endHour: 12 },
    { id: 'afternoon', label: '下午', range: '12:00–17:59', startHour: 12, endHour: 18 },
    { id: 'night', label: '夜晚', range: '18:00–04:59', startHour: 18, endHour: 5 },
  ],
  4: [
    { id: 'morning', label: '早上', range: '05:00–10:59', startHour: 5, endHour: 11 },
    { id: 'afternoon', label: '下午', range: '11:00–16:59', startHour: 11, endHour: 17 },
    { id: 'dusk', label: '黄昏', range: '17:00–19:59', startHour: 17, endHour: 20 },
    { id: 'night', label: '夜晚', range: '20:00–04:59', startHour: 20, endHour: 5 },
  ],
  5: [
    { id: 'morning', label: '早上', range: '05:00–09:59', startHour: 5, endHour: 10 },
    { id: 'noon', label: '中午', range: '10:00–13:59', startHour: 10, endHour: 14 },
    { id: 'afternoon', label: '下午', range: '14:00–17:59', startHour: 14, endHour: 18 },
    { id: 'dusk', label: '黄昏', range: '18:00–20:59', startHour: 18, endHour: 21 },
    { id: 'night', label: '夜晚', range: '21:00–04:59', startHour: 21, endHour: 5 },
  ],
  6: [
    { id: 'morning', label: '早上', range: '05:00–09:59', startHour: 5, endHour: 10 },
    { id: 'noon', label: '中午', range: '10:00–12:59', startHour: 10, endHour: 13 },
    { id: 'afternoon', label: '下午', range: '13:00–16:59', startHour: 13, endHour: 17 },
    { id: 'dusk', label: '黄昏', range: '17:00–19:59', startHour: 17, endHour: 20 },
    { id: 'evening', label: '晚上', range: '20:00–22:59', startHour: 20, endHour: 23 },
    { id: 'night', label: '夜晚', range: '23:00–04:59', startHour: 23, endHour: 5 },
  ],
};

export function getVideoCallBackgroundPreset(character?: Pick<CharacterProfile, 'videoCallBackgroundSegmentCount'> | null) {
  return VIDEO_CALL_BACKGROUND_PRESETS[character?.videoCallBackgroundSegmentCount || 4];
}

export function resolveVideoCallBackgroundPeriod(
  character: Pick<CharacterProfile, 'customTimezone' | 'customTimezoneEnabled' | 'videoCallBackgroundSegmentCount'>,
  now = new Date(),
): VideoCallBackgroundPeriod {
  const hour = nowInTimeZone(resolveCharTimeZone(character), now).getHours();
  return getVideoCallBackgroundPreset(character).find(({ startHour, endHour }) =>
    startHour < endHour ? hour >= startHour && hour < endHour : hour >= startHour || hour < endHour,
  )?.id || 'night';
}

export function resolveVideoCallBackground(
  character: Pick<CharacterProfile,
    'videoCallBackground' | 'videoCallBackgroundMode' | 'videoCallBackgroundSegmentCount' | 'videoCallBackgroundSchedule' |
    'customTimezone' | 'customTimezoneEnabled'>,
  now = new Date(),
): string | undefined {
  if (character.videoCallBackgroundMode !== 'time') return character.videoCallBackground;
  const period = resolveVideoCallBackgroundPeriod(character, now);
  const schedule = character.videoCallBackgroundSchedule;
  const legacy = period === 'afternoon' ? schedule?.day : period === 'dusk' ? schedule?.evening : undefined;
  return schedule?.[period] || legacy || character.videoCallBackground;
}

export function resolveVideoCallForeground(
  character: Pick<CharacterProfile,
    'videoCallForeground' | 'videoCallForegroundMode' | 'videoCallForegroundSchedule' |
    'videoCallBackgroundSegmentCount' | 'customTimezone' | 'customTimezoneEnabled'>,
  now = new Date(),
): string | undefined {
  if (character.videoCallForegroundMode !== 'time') return character.videoCallForeground;
  const period = resolveVideoCallBackgroundPeriod(character, now);
  const schedule = character.videoCallForegroundSchedule;
  const legacy = period === 'afternoon' ? schedule?.day : period === 'dusk' ? schedule?.evening : undefined;
  return schedule?.[period] || legacy || character.videoCallForeground;
}
