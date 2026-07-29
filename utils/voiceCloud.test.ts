import { describe, expect, it } from 'vitest';
import { shouldRunTencentSpeakerVerification, shouldRunXfyunVoiceProfile } from './voiceCloud';

describe('shouldRunTencentSpeakerVerification', () => {
  it('does not run from local baseline review alone', () => {
    expect(shouldRunTencentSpeakerVerification({
      cloudShouldReview: true,
      hasVoicePrintId: true,
      baselineProgress: 8,
      confidence: 0.72,
    })).toBe(false);
  });

  it('runs when local confidence is low', () => {
    expect(shouldRunTencentSpeakerVerification({
      cloudShouldReview: false,
      hasVoicePrintId: true,
      baselineProgress: 8,
      confidence: 0.42,
    })).toBe(true);
  });

  it('can run before baseline when local confidence is low', () => {
    expect(shouldRunTencentSpeakerVerification({
      cloudShouldReview: false,
      hasVoicePrintId: true,
      baselineProgress: 7,
      confidence: 0.42,
    })).toBe(true);
  });

  it('skips before baseline when confidence is okay, without a voice print, or without a local review trigger', () => {
    expect(shouldRunTencentSpeakerVerification({
      cloudShouldReview: true,
      hasVoicePrintId: true,
      baselineProgress: 7,
      confidence: 0.72,
    })).toBe(false);

    expect(shouldRunTencentSpeakerVerification({
      cloudShouldReview: true,
      hasVoicePrintId: false,
      baselineProgress: 8,
      confidence: 0.2,
    })).toBe(false);

    expect(shouldRunTencentSpeakerVerification({
      cloudShouldReview: false,
      hasVoicePrintId: true,
      baselineProgress: 8,
      confidence: 0.72,
    })).toBe(false);
  });
});

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

  it('can rely on Worker env AppId after Tencent says unmatched', () => {
    expect(shouldRunXfyunVoiceProfile({
      cloudShouldReview: false,
      speakerStatus: 'unmatched',
      hasAppId: false,
      allowWorkerEnvAppId: true,
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
