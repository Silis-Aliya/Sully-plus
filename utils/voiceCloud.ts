import { getProxyWorkerUrl } from './proxyWorker';
import type { EarsLiteResult } from './earsLite';

export interface PreparedVoiceCloudAudio {
  sampleRate: 16000;
  wavBase64: string;
  pcmBase64: string;
}

export interface TencentSpeakerVerificationResult {
  status: 'matched' | 'unmatched' | 'uncertain';
  matched?: boolean;
  score?: number;
  decision?: number;
  voicePrintId?: string;
  requestId?: string;
  raw?: unknown;
}

export interface TencentSpeakerEnrollResult {
  ok?: boolean;
  voicePrintId?: string;
  speakerNick?: string;
  requestId?: string;
  raw?: unknown;
}

export interface TencentSpeakerDeleteResult {
  ok?: boolean;
  voicePrintId?: string;
  requestId?: string;
  raw?: unknown;
}

export interface XfyunVoiceProfileResult {
  gender?: string;
  genderScores?: { female?: number; male?: number };
  age?: string;
  ageScores?: { child?: number; middle?: number; old?: number };
  sid?: string;
  raw?: unknown;
}

export interface VoiceCloudReviewDecision {
  shouldReview: boolean;
  reasons: string[];
}

const readRelativeNumber = (relative: Record<string, unknown>, key: string): number | null => {
  const raw = relative[key];
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
};

export function decideVoiceCloudReview(lite: Pick<EarsLiteResult, 'relative' | 'baselineProgress'>): VoiceCloudReviewDecision {
  if ((lite.baselineProgress || 0) < 8 || !lite.relative || typeof lite.relative !== 'object') {
    return { shouldReview: false, reasons: [] };
  }
  const relative = lite.relative as Record<string, unknown>;
  const reasons: string[] = [];
  const energyRatio = readRelativeNumber(relative, 'energyRatio');
  const pauseDelta = readRelativeNumber(relative, 'pauseDelta');
  const pitchRatio = readRelativeNumber(relative, 'pitchRatio');
  const swayRatio = readRelativeNumber(relative, 'swayRatio');
  const brightnessRatio = readRelativeNumber(relative, 'brightnessRatio');

  if (energyRatio != null && (energyRatio < 0.55 || energyRatio > 1.8)) reasons.push('音量明显偏离基线');
  if (pauseDelta != null && Math.abs(pauseDelta) > 0.32) reasons.push('停顿明显偏离基线');
  if (pitchRatio != null && (pitchRatio < 0.75 || pitchRatio > 1.35)) reasons.push('音高明显偏离基线');
  if (swayRatio != null && swayRatio > 2) reasons.push('起伏明显偏离基线');
  if (brightnessRatio != null && (brightnessRatio < 0.65 || brightnessRatio > 1.55)) reasons.push('明亮度明显偏离基线');

  return { shouldReview: reasons.length > 0, reasons };
}

const getAudioContext = (): AudioContext => {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) throw new Error('当前浏览器不支持 Web Audio');
  return new Ctor();
};

const blobToAudioBuffer = async (blob: Blob): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    try { await ctx.close(); } catch {}
  }
};

const renderMono16k = async (buffer: AudioBuffer): Promise<Float32Array> => {
  const sampleRate = 16000;
  const length = Math.max(1, Math.ceil(buffer.duration * sampleRate));
  const OfflineCtor = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtor) throw new Error('当前浏览器不支持离线音频转换');
  const offline = new OfflineCtor(1, length, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  const rendered: AudioBuffer = await offline.startRendering();
  return rendered.getChannelData(0).slice();
};

const floatToPcm16 = (audio: Float32Array): Uint8Array => {
  const out = new Uint8Array(audio.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < audio.length; i++) {
    const s = Math.max(-1, Math.min(1, audio[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
};

const pcm16ToWav = (pcm: Uint8Array, sampleRate = 16000): Uint8Array => {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i);
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export async function prepareVoiceCloudAudio(blob: Blob): Promise<PreparedVoiceCloudAudio> {
  const decoded = await blobToAudioBuffer(blob);
  const mono = await renderMono16k(decoded);
  const pcm = floatToPcm16(mono);
  const wav = pcm16ToWav(pcm, 16000);
  return {
    sampleRate: 16000,
    wavBase64: bytesToBase64(wav),
    pcmBase64: bytesToBase64(pcm),
  };
}

const postVoiceWorker = async <T>(path: string, payload: Record<string, unknown>): Promise<T> => {
  const res = await fetch(`${getProxyWorkerUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || `Voice worker ${res.status}`);
  return data as T;
};

export async function verifyTencentSpeaker(
  prepared: PreparedVoiceCloudAudio,
  voicePrintId: string,
): Promise<TencentSpeakerVerificationResult> {
  return postVoiceWorker<TencentSpeakerVerificationResult>('/voice/tencent/verify', {
    data: prepared.wavBase64,
    voiceFormat: 1,
    sampleRate: prepared.sampleRate,
    voicePrintId,
  });
}

export async function enrollTencentSpeaker(
  prepared: PreparedVoiceCloudAudio,
  speakerNick?: string,
): Promise<TencentSpeakerEnrollResult> {
  return postVoiceWorker<TencentSpeakerEnrollResult>('/voice/tencent/enroll', {
    data: prepared.wavBase64,
    voiceFormat: 1,
    sampleRate: prepared.sampleRate,
    speakerNick: speakerNick || undefined,
  });
}

export async function deleteTencentSpeaker(
  voicePrintId: string,
): Promise<TencentSpeakerDeleteResult> {
  return postVoiceWorker<TencentSpeakerDeleteResult>('/voice/tencent/delete', {
    voicePrintId,
  });
}

export async function profileVoiceWithXfyun(
  prepared: PreparedVoiceCloudAudio,
  appId?: string,
): Promise<XfyunVoiceProfileResult> {
  return postVoiceWorker<XfyunVoiceProfileResult>('/voice/xfyun/profile', {
    data: prepared.pcmBase64,
    aue: 'raw',
    rate: prepared.sampleRate,
    appId: appId || undefined,
  });
}
