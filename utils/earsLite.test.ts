import { afterEach, describe, expect, it, vi } from 'vitest';
import { transcribeWithGroq } from './earsLite';

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
