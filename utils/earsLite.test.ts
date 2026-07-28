import { afterEach, describe, expect, it, vi } from 'vitest';
import { transcribeWithEarsAsr, transcribeWithFunAsr, transcribeWithGroq } from './earsLite';

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

describe('transcribeWithFunAsr', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the SiliconFlow SenseVoice endpoint defaults', async () => {
    let body: BodyInit | null | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      body = init?.body;
      return new Response(JSON.stringify({ text: '你好' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeWithFunAsr(new Blob(['audio'], { type: 'audio/webm' }), {
      apiKey: 'sk_test',
    });

    expect(text).toBe('你好');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.siliconflow.cn/v1/audio/transcriptions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect((body as FormData).get('model')).toBe('FunAudioLLM/SenseVoiceSmall');
    expect((body as FormData).get('language')).toBe('zh');
  });
});

describe('transcribeWithEarsAsr', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back from FunASR to Groq in auto mode', async () => {
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
      funAsrApiKey: 'sk_fun',
      groqApiKey: 'gsk_test',
    });

    expect(result.text).toBe('兜底成功');
    expect(result.provider).toContain('groq:');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
