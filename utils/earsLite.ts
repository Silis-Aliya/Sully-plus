export interface EarsLiteFeatures {
  durationSec: number;
  sampleRate: number;
  rmsMean: number;
  rmsStd: number;
  peak: number;
  pauseRatio: number;
  energySway: number;
  pitchHz?: number;
  pitchRange?: number;
  pitchJitter?: number;
  brightness?: number;
  zeroCrossingRate?: number;
  essentiaEnergy?: number;
  essentiaDynamicComplexity?: number;
  engine: 'essentia.js+webaudio' | 'webaudio-fallback';
}

export interface EarsLiteResult {
  features: EarsLiteFeatures;
  relative: Record<string, number | string>;
  emotion: string;
  confidence: number;
  hint: string;
  baselineProgress: number;
}

interface Baseline {
  count: number;
  rmsMean: number;
  pauseRatio: number;
  pitchHz: number;
  energySway: number;
  brightness: number;
}

export interface EarsLiteBaselineStatus {
  count: number;
  target: number;
  ready: boolean;
  baseline: Baseline | null;
}

export interface GroqVoiceToneResult {
  emotion: string;
  confidence: number;
  hint: string;
}

const BASELINE_KEY = 'sully_ears_lite_baseline_v1';
export const EARS_LITE_BASELINE_TARGET = 8;
const BASELINE_TARGET = EARS_LITE_BASELINE_TARGET;
const DEBUG_KEY = 'sully_ears_lite_debug';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const mean = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const std = (arr: number[]) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(v => (v - m) ** 2)));
};

const isEarsLiteDebugEnabled = (): boolean => {
  try { return localStorage.getItem(DEBUG_KEY) === '1'; } catch { return false; }
};

const debugEarsLite = (label: string, payload: unknown): void => {
  if (!isEarsLiteDebugEnabled()) return;
  try { console.log(`[ears-lite] ${label}`, payload); } catch {}
};

const readBaseline = (): Baseline | null => {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? JSON.parse(raw) as Baseline : null;
  } catch {
    return null;
  }
};

const writeBaseline = (features: EarsLiteFeatures): Baseline => {
  const prev = readBaseline();
  const count = Math.min((prev?.count || 0) + 1, 200);
  const weightPrev = prev ? Math.min(prev.count, BASELINE_TARGET) : 0;
  const weightNew = 1;
  const blend = (key: keyof Baseline, value: number) => {
    const old = prev?.[key];
    if (typeof old !== 'number' || !Number.isFinite(old)) return value;
    return ((old * weightPrev) + (value * weightNew)) / (weightPrev + weightNew);
  };
  const next: Baseline = {
    count,
    rmsMean: blend('rmsMean', features.rmsMean),
    pauseRatio: blend('pauseRatio', features.pauseRatio),
    pitchHz: blend('pitchHz', features.pitchHz || 0),
    energySway: blend('energySway', features.energySway),
    brightness: blend('brightness', features.brightness || 0),
  };
  try { localStorage.setItem(BASELINE_KEY, JSON.stringify(next)); } catch {}
  return next;
};

export const getEarsLiteBaselineStatus = (): EarsLiteBaselineStatus => {
  const baseline = readBaseline();
  const count = Math.min(baseline?.count || 0, BASELINE_TARGET);
  return {
    count,
    target: BASELINE_TARGET,
    ready: count >= BASELINE_TARGET,
    baseline,
  };
};

export const resetEarsLiteBaseline = (): void => {
  try { localStorage.removeItem(BASELINE_KEY); } catch {}
};

const getAudioContext = (): AudioContext => {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) throw new Error('当前环境不支持 Web Audio');
  return new Ctor();
};

const decodeBlob = async (blob: Blob): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  const arr = await blob.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arr.slice(0));
  try { await ctx.close(); } catch {}
  return buffer;
};

const toMono = (buffer: AudioBuffer): Float32Array => {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const len = buffer.length;
  const mono = new Float32Array(len);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
};

const frameRms = (audio: Float32Array, frameSize: number, hopSize: number): number[] => {
  const out: number[] = [];
  for (let start = 0; start + frameSize <= audio.length; start += hopSize) {
    let sum = 0;
    for (let i = 0; i < frameSize; i++) sum += audio[start + i] ** 2;
    out.push(Math.sqrt(sum / frameSize));
  }
  return out;
};

const estimatePitch = (frame: Float32Array, sampleRate: number): number | null => {
  const minHz = 70;
  const maxHz = 450;
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.floor(sampleRate / minHz);
  let bestLag = 0;
  let best = 0;
  let energy = 0;
  for (let i = 0; i < frame.length; i++) energy += frame[i] ** 2;
  if (energy / frame.length < 0.00008) return null;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) corr += frame[i] * frame[i + lag];
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  if (!bestLag || best / energy < 0.22) return null;
  return sampleRate / bestLag;
};

const estimatePitchSeries = (audio: Float32Array, sampleRate: number, frameSize: number, hopSize: number): number[] => {
  const pitches: number[] = [];
  for (let start = 0; start + frameSize <= audio.length; start += hopSize * 2) {
    const p = estimatePitch(audio.slice(start, start + frameSize), sampleRate);
    if (p && Number.isFinite(p)) pitches.push(p);
  }
  return pitches;
};

const zeroCrossingRate = (audio: Float32Array): number => {
  let crossings = 0;
  for (let i = 1; i < audio.length; i++) {
    if ((audio[i - 1] < 0 && audio[i] >= 0) || (audio[i - 1] >= 0 && audio[i] < 0)) crossings++;
  }
  return audio.length ? crossings / audio.length : 0;
};

const spectralBrightnessProxy = (audio: Float32Array, sampleRate: number): number => {
  const step = Math.max(1, Math.floor(sampleRate / 4000));
  let fast = 0;
  let total = 0;
  for (let i = step; i < audio.length; i += step) {
    fast += Math.abs(audio[i] - audio[i - step]);
    total += Math.abs(audio[i]);
  }
  return total > 0 ? fast / total : 0;
};

const tryEssentiaFeatures = async (audio: Float32Array): Promise<Partial<EarsLiteFeatures>> => {
  try {
    // Import the browser-targeted builds directly so Vite can keep Essentia out
    // of the main app chunk. The package root points at UMD files that also
    // contain Node fallbacks (fs/path/crypto), which are noisy in browser builds.
    // @ts-expect-error essentia.js does not publish typed subpath exports.
    const coreMod: any = await import('essentia.js/dist/essentia.js-core.es.js');
    // @ts-expect-error essentia.js does not publish typed subpath exports.
    const wasmMod: any = await import('essentia.js/dist/essentia-wasm.web.js');
    const wasmUrl = new URL('essentia.js/dist/essentia-wasm.web.wasm', import.meta.url).href;
    const Essentia = coreMod.default || coreMod.Essentia;
    const wasmFactory = wasmMod.default || wasmMod.EssentiaWASM || (globalThis as any).EssentiaWASM || wasmMod;
    const EssentiaWASM = typeof wasmFactory === 'function'
      ? await wasmFactory({ locateFile: (path: string) => path.endsWith('.wasm') ? wasmUrl : path })
      : wasmFactory;
    if (!Essentia || !EssentiaWASM) return {};
    const essentia = new Essentia(EssentiaWASM);
    const vector = essentia.arrayToVector(audio);
    const energy = essentia.Energy(vector)?.energy;
    let dynamicComplexity: number | undefined;
    try {
      dynamicComplexity = essentia.DynamicComplexity(vector)?.dynamicComplexity;
    } catch {}
    try { vector.delete?.(); } catch {}
    try { essentia.delete?.(); } catch {}
    return {
      essentiaEnergy: typeof energy === 'number' && Number.isFinite(energy) ? energy : undefined,
      essentiaDynamicComplexity: typeof dynamicComplexity === 'number' && Number.isFinite(dynamicComplexity) ? dynamicComplexity : undefined,
      engine: 'essentia.js+webaudio',
    };
  } catch (error) {
    console.warn('[ears-lite] Essentia.js unavailable, using Web Audio fallback:', error);
    return {};
  }
};

const describeRelative = (features: EarsLiteFeatures, baseline: Baseline): {
  relative: Record<string, number | string>;
  emotion: string;
  confidence: number;
  hint: string;
} => {
  const energyRatio = baseline.rmsMean > 0 ? features.rmsMean / baseline.rmsMean : 1;
  const pauseDelta = features.pauseRatio - baseline.pauseRatio;
  const pitchRatio = baseline.pitchHz > 0 && features.pitchHz ? features.pitchHz / baseline.pitchHz : 1;
  const swayRatio = baseline.energySway > 0 ? features.energySway / baseline.energySway : 1;
  const brightnessRatio = baseline.brightness > 0 && features.brightness ? features.brightness / baseline.brightness : 1;
  const notes: string[] = [];

  if (energyRatio < 0.72) notes.push('比平时更轻');
  if (energyRatio > 1.35) notes.push('比平时更有力');
  if (pauseDelta > 0.16) notes.push('停顿更多');
  if (pauseDelta < -0.12) notes.push('停顿更少');
  if (pitchRatio > 1.12) notes.push('音高偏高');
  if (pitchRatio < 0.9) notes.push('音高偏低');
  if (swayRatio > 1.35) notes.push('能量起伏更明显');
  if (brightnessRatio > 1.18) notes.push('声音更亮/更紧');

  let emotion = '平静';
  if (energyRatio < 0.78 && pauseDelta > 0.1) emotion = '疲惫/犹豫';
  else if (energyRatio > 1.25 && (pitchRatio > 1.08 || swayRatio > 1.25)) emotion = '激动/急切';
  else if (pauseDelta > 0.2) emotion = '迟疑';
  else if (energyRatio < 0.72) emotion = '低落/轻声';

  const confidence = clamp(0.45 + Math.min(notes.length, 3) * 0.12, 0.45, 0.82);
  return {
    relative: {
      energyRatio: Number(energyRatio.toFixed(2)),
      pauseDelta: Number(pauseDelta.toFixed(2)),
      pitchRatio: Number(pitchRatio.toFixed(2)),
      swayRatio: Number(swayRatio.toFixed(2)),
      brightnessRatio: Number(brightnessRatio.toFixed(2)),
    },
    emotion,
    confidence,
    hint: notes.length ? notes.join('，') : '接近平时声音基线',
  };
};

export async function analyzeVoiceWithEarsLite(blob: Blob): Promise<EarsLiteResult> {
  const buffer = await decodeBlob(blob);
  const audio = toMono(buffer);
  const sampleRate = buffer.sampleRate;
  const durationSec = buffer.duration || audio.length / sampleRate;
  const frameSize = Math.min(2048, Math.max(512, Math.floor(sampleRate * 0.046)));
  const hopSize = Math.floor(frameSize / 2);
  const rms = frameRms(audio, frameSize, hopSize);
  const rmsMean = mean(rms);
  const rmsStd = std(rms);
  const silenceThreshold = Math.max(0.008, rmsMean * 0.42);
  const pauseRatio = rms.length ? rms.filter(v => v < silenceThreshold).length / rms.length : 0;
  const peak = audio.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const pitches = estimatePitchSeries(audio, sampleRate, frameSize, hopSize);
  const pitchHz = pitches.length ? mean(pitches) : undefined;
  const pitchRange = pitches.length ? Math.max(...pitches) - Math.min(...pitches) : undefined;
  const pitchJitter = pitches.length > 2 && pitchHz ? std(pitches) / pitchHz : undefined;
  const baseFeatures: EarsLiteFeatures = {
    durationSec: Number(durationSec.toFixed(2)),
    sampleRate,
    rmsMean: Number(rmsMean.toFixed(5)),
    rmsStd: Number(rmsStd.toFixed(5)),
    peak: Number(peak.toFixed(5)),
    pauseRatio: Number(pauseRatio.toFixed(3)),
    energySway: Number((rmsMean > 0 ? rmsStd / rmsMean : 0).toFixed(3)),
    pitchHz: pitchHz ? Number(pitchHz.toFixed(1)) : undefined,
    pitchRange: pitchRange ? Number(pitchRange.toFixed(1)) : undefined,
    pitchJitter: pitchJitter ? Number(pitchJitter.toFixed(3)) : undefined,
    brightness: Number(spectralBrightnessProxy(audio, sampleRate).toFixed(3)),
    zeroCrossingRate: Number(zeroCrossingRate(audio).toFixed(4)),
    engine: 'webaudio-fallback',
  };
  const essentia = await tryEssentiaFeatures(audio);
  const features = { ...baseFeatures, ...essentia } as EarsLiteFeatures;
  const prev = readBaseline();
  const next = writeBaseline(features);
  const baselineProgress = Math.min(next.count, BASELINE_TARGET);
  if (!prev || prev.count < BASELINE_TARGET) {
    const result = {
      features,
      relative: { status: `正在建立个人声音基线 ${baselineProgress}/${BASELINE_TARGET}` },
      emotion: '基线建立中',
      confidence: 0.45,
      hint: `正在建立个人声音基线 ${baselineProgress}/${BASELINE_TARGET}`,
      baselineProgress,
    };
    debugEarsLite('analysis', {
      mode: 'baseline',
      baselineBefore: prev,
      baselineAfter: next,
      result,
    });
    return result;
  }
  const result = {
    features,
    baselineProgress,
    ...describeRelative(features, prev),
  };
  debugEarsLite('analysis', {
    mode: 'relative',
    baselineBefore: prev,
    baselineAfter: next,
    result,
  });
  return result;
}

type EarsAsrProvider = 'groq' | 'volcengine' | 'auto';

type OpenAICompatibleAsrConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  mimeType?: string;
  language?: string;
};

type VolcengineAsrConfig = {
  apiKey?: string;
  appId?: string;
  accessKey?: string;
  endpoint?: string;
  resourceId?: string;
  uid?: string;
  audioDataBase64?: string;
};

const VOLCENGINE_ASR_ENDPOINT = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
const VOLCENGINE_ASR_RESOURCE_ID = 'volc.bigasr.auc_turbo';

const appendAsrForm = (blob: Blob, config: Pick<OpenAICompatibleAsrConfig, 'mimeType' | 'model' | 'language'>) => {
  const language = (config.language === undefined ? 'zh' : config.language).trim();
  const ext = (config.mimeType || blob.type).includes('mp4') ? 'm4a'
    : (config.mimeType || blob.type).includes('ogg') ? 'ogg'
    : 'webm';
  const form = new FormData();
  form.append('file', blob, `sully-voice.${ext}`);
  form.append('model', (config.model || '').trim());
  if (language) form.append('language', language);
  return form;
};

const readAsrText = async (res: Response, providerLabel: string): Promise<string> => {
  if (!res.ok) {
    if (res.status === 401) throw new Error(`${providerLabel} 401：API Key 无效、未保存，或复制错了`);
    if (res.status === 403) throw new Error(`${providerLabel} 403：账号或 Key 没有这个模型/接口权限`);
    if (res.status === 429) throw new Error(`${providerLabel} 429：额度或频率限制`);
    if (res.status === 503 || res.status === 504) throw new Error(`${providerLabel} ${res.status}：服务繁忙或超时`);
    throw new Error(`${providerLabel} ${res.status}`);
  }
  const data = await res.json();
  return String(data?.text || data?.transcript || '').trim();
};

export async function transcribeWithGroq(blob: Blob, config: OpenAICompatibleAsrConfig): Promise<string> {
  const apiKey = (config.apiKey || '').trim();
  if (!apiKey) throw new Error('缺少 Groq API Key');
  const base = (config.baseUrl || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const model = (config.model || 'whisper-large-v3-turbo').trim();
  const form = appendAsrForm(blob, { ...config, model });
  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  return readAsrText(res, 'Groq Whisper');
}

const getVolcengineRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export async function transcribeWithVolcengine(config: VolcengineAsrConfig): Promise<string> {
  const apiKey = (config.apiKey || '').trim();
  const appId = (config.appId || '').trim();
  const accessKey = (config.accessKey || '').trim();
  const audioDataBase64 = (config.audioDataBase64 || '').trim();
  if (!apiKey && !(appId && accessKey)) throw new Error('缺少火山豆包 ASR API Key');
  if (!audioDataBase64) throw new Error('火山豆包 ASR 需要先把录音转换成 WAV base64');

  const endpoint = (config.endpoint || VOLCENGINE_ASR_ENDPOINT).trim();
  const resourceId = (config.resourceId || VOLCENGINE_ASR_RESOURCE_ID).trim();

  const res = await fetch(`${getProxyWorkerUrl()}/volcengine/asr`, {
    method: 'POST',
    headers: apiKey ? {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    } : {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint,
      resourceId,
      requestId: getVolcengineRequestId(),
      appId: apiKey ? undefined : appId,
      accessKey: apiKey ? undefined : accessKey,
      user: { uid: (config.uid || appId || 'sullyos').trim() },
      audio: { data: audioDataBase64 },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: true,
        enable_ddc: true,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  const statusCode = String(res.headers.get('X-Api-Status-Code') || data?.code || data?.resp?.code || '');
  const statusMessage = String(res.headers.get('X-Api-Message') || data?.message || data?.resp?.message || '');
  if (!res.ok || (statusCode && statusCode !== '20000000')) {
    if (res.status === 401 || res.status === 403) throw new Error(`火山豆包 ASR ${res.status}：API Key 或模型权限不对`);
    throw new Error(`火山豆包 ASR ${statusCode || res.status || '失败'}：${statusMessage || '没有返回可用文本'}`);
  }
  const text = String(
    data?.result?.text
    || data?.text
    || data?.transcript
    || data?.result?.utterances?.map((item: any) => item?.text).filter(Boolean).join('')
    || '',
  ).trim();
  if (!text) throw new Error('火山豆包 ASR 没有返回文字');
  return text;
}

export async function transcribeWithEarsAsr(blob: Blob, config: OpenAICompatibleAsrConfig & {
  provider?: EarsAsrProvider;
  groqApiKey?: string;
  groqBaseUrl?: string;
  groqModel?: string;
  volcengineApiKey?: string;
  volcengineAppId?: string;
  volcengineAccessKey?: string;
  volcengineEndpoint?: string;
  volcengineResourceId?: string;
  volcengineUid?: string;
  volcengineAudioDataBase64?: string;
}): Promise<{ text: string; provider: string }> {
  const provider = config.provider || 'groq';
  const language = config.language;
  const attempts: Array<() => Promise<{ text: string; provider: string }>> = [];
  const addVolcengine = () => attempts.push(async () => ({
    text: await transcribeWithVolcengine({
      apiKey: config.volcengineApiKey || config.apiKey,
      appId: config.volcengineAppId,
      accessKey: config.volcengineAccessKey,
      endpoint: config.volcengineEndpoint,
      resourceId: config.volcengineResourceId,
      uid: config.volcengineUid,
      audioDataBase64: config.volcengineAudioDataBase64,
    }),
    provider: `volcengine:${config.volcengineResourceId || VOLCENGINE_ASR_RESOURCE_ID}`,
  }));
  const addGroq = () => attempts.push(async () => ({
    text: await transcribeWithGroq(blob, {
      apiKey: config.groqApiKey || config.apiKey,
      baseUrl: config.groqBaseUrl || config.baseUrl,
      model: config.groqModel || config.model,
      mimeType: config.mimeType,
      language,
    }),
    provider: `groq:${config.groqModel || config.model || 'whisper-large-v3-turbo'}`,
  }));

  if (provider === 'volcengine') addVolcengine();
  else if (provider === 'auto') {
    if ((config.volcengineApiKey || config.apiKey || '').trim() || ((config.volcengineAppId || '').trim() && (config.volcengineAccessKey || '').trim())) addVolcengine();
    if ((config.groqApiKey || '').trim()) addGroq();
  } else addGroq();

  if (!attempts.length) throw new Error('请先在设置 → 语音识别里填写 Groq 或火山豆包 ASR API Key');
  let lastError: any;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.text) return result;
      lastError = new Error(`${result.provider} 没有返回文字`);
    } catch (err) {
      lastError = err;
      if (provider !== 'auto') break;
    }
  }
  throw lastError || new Error('语音识别失败');
}

const EARS_TONE_EMOTIONS = '开心/兴奋/撒娇/平静/期待/低落/委屈/生气/嘴硬/紧张/黏人/烦躁/焦虑/强撑/敷衍/犹豫/认真/哽咽/憋笑';

const buildGroqTonePrompt = (transcript: string, lite: EarsLiteResult): string => [
  '简短转述用户的语气和情绪给AI伴侣。',
  `Ta说的话：「${transcript || '（未识别到文字）'}」`,
  `声学特征：${JSON.stringify(lite.features)}`,
  `和ta平时相比：${JSON.stringify(lite.relative)}`,
  `从这些标签里选1个：${EARS_TONE_EMOTIONS}`,
  '规则：特征只是线索，以说话内容为主；不要过度解读；hint 用一句话描述她此刻状态，不许编造原因或事件。',
  '只输出 JSON：{"emotion":"...","confidence":0.0到1.0,"hint":"..."}',
].join('\n');

const parseGroqToneJson = (raw: string): GroqVoiceToneResult => {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const data = JSON.parse(start >= 0 && end >= start ? text.slice(start, end + 1) : text);
  const confidenceRaw = Number(data?.confidence);
  return {
    emotion: String(data?.emotion || '平静').trim() || '平静',
    confidence: Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : 0.45,
    hint: String(data?.hint || '语气线索不足，接近平时状态。').trim(),
  };
};

export async function judgeVoiceToneWithGroq(transcript: string, lite: EarsLiteResult, config: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<GroqVoiceToneResult> {
  const apiKey = (config.apiKey || '').trim();
  if (!apiKey) throw new Error('缺少 Groq API Key');
  const base = (config.baseUrl || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const model = (config.model || 'llama-3.3-70b-versatile').trim();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 180,
      messages: [{ role: 'user', content: buildGroqTonePrompt(transcript, lite) }],
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Groq 语气转述 401：API Key 无效、未保存，或复制错了');
    if (res.status === 429) throw new Error('Groq 语气转述 429：额度或频率限制');
    throw new Error(`Groq 语气转述 ${res.status}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  const result = parseGroqToneJson(raw);
  debugEarsLite('tone-llm', { model, raw, result });
  return result;
}
import { getProxyWorkerUrl } from './proxyWorker';
