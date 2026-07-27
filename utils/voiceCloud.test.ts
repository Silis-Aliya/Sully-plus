import { describe, expect, it } from 'vitest';
import { shouldRunXfyunVoiceProfile } from './voiceCloud';

describe('shouldRunXfyunVoiceProfile', () => {
  it('runs when local cloud review requests a profile', () => {
    expect(shouldRunXfyunVoiceProfile({
      cloudShouldReview: true,
      hasAppId: true,
      durationSec: 6,
    })).toBe(true);
  });

  it('runs after Tencent says the speaker is unmatched', () => {
    expect(shouldRunXfyunVoiceProfile({
      cloudShouldReview: false,
      speakerStatus: 'unmatched',
      hasAppId: true,
      durationSec: 6,
    })).toBe(true);
  });

  it('skips when Xfyun is not configured or the sample is too long', () => {
    expect(shouldRunXfyunVoiceProfile({
      cloudShouldReview: true,
      hasAppId: false,
      durationSec: 6,
    })).toBe(false);

    expect(shouldRunXfyunVoiceProfile({
      cloudShouldReview: true,
      hasAppId: true,
      durationSec: 11,
    })).toBe(false);
  });
});
