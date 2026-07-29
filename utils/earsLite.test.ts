import { afterEach, describe, expect, it, vi } from 'vitest';
import { transcribeWithEarsAsr, transcribeWithGroq, transcribeWithVolcengine } from './earsLite';

describe('transcribeWithGroq', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('locks Ears Lite transcription to Chinese by default', async () => {
    let body: BodyInit | null | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body;
      return new Response(JSON.stringify({ text: '你好' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeWithGroq(new Blob(['audio'], { type: 'audio/webm' }), {
      apiKey: 'gsk_test',
    });

    expect(text).toBe('你好');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('language')).toBe('zh');
  });

  it('allows an explicit transcription language override', async () => {
    let body: BodyInit | null | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body;
      return new Response(JSON.stringify({ text: 'hello' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));

    await transcribeWithGroq(new Blob(['audio'], { type: 'audio/webm' }), {
      apiKey: 'gsk_test',
      language: 'en',
    });

    expect((body as FormData).get('language')).toBe('en');
  });

  it('omits the transcription language when auto detection is requested', async () => {
    let body: BodyInit | null | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body;
      return new Response(JSON.stringify({ text: '你好 hello' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));

    await transcribeWithGroq(new Blob(['audio'], { type: 'audio/webm' }), {
      apiKey: 'gsk_test',
      language: '',
    });

    expect((body as FormData).has('language')).toBe(false);
  });
});

describe('transcribeWithVolcengine', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Volcengine Doubao flash ASR endpoint defaults', async () => {
    let body: BodyInit | null | undefined;
    let headers: HeadersInit | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body;
      headers = init?.headers;
      return new Response(JSON.stringify({ result: { text: '你好' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Api-Status-Code': '20000000' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeWithVolcengine({
      apiKey: 'volc_test',
      audioDataBase64: 'wav-base64',
    });

    expect(text).toBe('你好');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sullyos-main-proxy.sully-aliya.workers.dev/volcengine/asr',
      expect.objectContaining({ method: 'POST' }),
    );
    expect((headers as Record<string, string>).Authorization).toBe('Bearer volc_test');
    const payload = JSON.parse(String(body));
    expect(payload.endpoint).toBe('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash');
    expect(payload.resourceId).toBe('volc.bigasr.auc_turbo');
    expect(payload.audio.data).toBe('wav-base64');
  });
});

describe('transcribeWithEarsAsr', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back from Volcengine to Groq in auto mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate limit', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ text: '兜底成功' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await transcribeWithEarsAsr(new Blob(['audio'], { type: 'audio/webm' }), {
      provider: 'auto',
      volcengineApiKey: 'volc_test',
      volcengineAudioDataBase64: 'wav-base64',
      groqApiKey: 'gsk_test',
    });

    expect(result.text).toBe('兜底成功');
    expect(result.provider).toContain('groq:');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
