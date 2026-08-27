import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onRequestPost, type Env } from '../functions/api/ai';

const configuredEnv: Env = {
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
};

const makeRequest = (rawBody: string, headers: Record<string, string> = {}) =>
  new Request('https://example.test/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: rawBody,
  });

const makeJsonRequest = (body: unknown, headers: Record<string, string> = {}) =>
  makeRequest(JSON.stringify(body), headers);

const invoke = async (request: Request, env: Env = configuredEnv) =>
  (await onRequestPost({
    request,
    env,
    params: {},
    data: {},
    functionPath: '/api/ai',
    waitUntil: vi.fn<(promise: Promise<unknown>) => void>(),
    passThroughOnException: vi.fn<() => void>(),
    next: vi.fn<() => Promise<Response>>(),
  } as Parameters<typeof onRequestPost>[0])) as Response;

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const readJson = async (response: Response) => (await response.json()) as Record<string, unknown>;

let fetchMock = vi.fn<typeof fetch>();

describe('POST /api/ai', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockRejectedValue(new Error('Unexpected network request in test'));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('application/json以外を拒否する', async () => {
    const response = await invoke(
      makeRequest(JSON.stringify({ prompt: 'hello', turnstileToken: 'token' }), {
        'Content-Type': 'text/plain',
      }),
    );

    expect(response.status).toBe(415);
    expect(await readJson(response)).toEqual({ error: 'Content-Type must be application/json.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('壊れたJSONを拒否する', async () => {
    const response = await invoke(makeRequest('{'));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: 'Invalid JSON body.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ turnstileToken: 'token' }, 'Prompt is required.', 400],
    [{ prompt: 'hello' }, 'Turnstile token is required.', 400],
    [{ prompt: 'x'.repeat(16_001), turnstileToken: 'token' }, 'Prompt is too long.', 413],
  ])('入力値を検証する: %j', async (body, error, status) => {
    const response = await invoke(makeJsonRequest(body));

    expect(response.status).toBe(status);
    expect(await readJson(response)).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('宣言されたContent-Lengthが上限を超えるリクエストを本文読取前に拒否する', async () => {
    const response = await invoke(
      makeJsonRequest(
        { prompt: 'hello', turnstileToken: 'token' },
        { 'Content-Length': String(64 * 1024 + 1) },
      ),
    );

    expect(response.status).toBe(413);
    expect(await readJson(response)).toEqual({ error: 'Request body is too large.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('実際のUTF-8本文サイズが上限を超えるリクエストを拒否する', async () => {
    const response = await invoke(
      makeJsonRequest({ prompt: 'あ'.repeat(22_000), turnstileToken: 'token' }),
    );

    expect(response.status).toBe(413);
    expect(await readJson(response)).toEqual({ error: 'Request body is too large.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Turnstileの秘密値がない場合は設定エラーを返す', async () => {
    const response = await invoke(makeJsonRequest({ prompt: 'hello', turnstileToken: 'token' }), {
      ...configuredEnv,
      TURNSTILE_SECRET_KEY: ' ',
    });

    expect(response.status).toBe(500);
    expect(await readJson(response)).toEqual({ error: 'Bot verification is not configured.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Turnstileが拒否した場合はAIプロバイダを呼ばない', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] }),
    );

    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'invalid-token' }),
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({ error: 'Failed bot verification.' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('Turnstileへの通信が失敗した場合は検証失敗として扱う', async () => {
    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'test-token' }),
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({ error: 'Failed bot verification.' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['CLOUDFLARE_ACCOUNT_ID', { ...configuredEnv, CLOUDFLARE_ACCOUNT_ID: ' ' }],
    ['CLOUDFLARE_API_TOKEN', { ...configuredEnv, CLOUDFLARE_API_TOKEN: ' ' }],
  ])('%sがない場合はAI設定エラーを返す', async (_name, env) => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'test-token' }),
      env,
    );

    expect(response.status).toBe(500);
    expect(await readJson(response)).toEqual({ error: 'AI provider is not configured.' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('AIプロバイダがHTTPエラーを返した場合は502を返す', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true })).mockResolvedValueOnce(
      jsonResponse({ errors: [{ code: 3036, message: 'daily allocation exceeded' }] }, 429, {
        'cf-ray': 'test-ray',
        'retry-after': '60',
      }),
    );

    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'test-token' }),
    );

    expect(response.status).toBe(502);
    expect(await readJson(response)).toEqual({ error: 'AI generation failed.' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith('Cloudflare AI returned an error.', {
      status: 429,
      rayId: 'test-ray',
      errorCodes: [3036],
      retryAfter: '60',
    });
  });

  it('AIプロバイダへの通信が失敗した場合は502を返す', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockRejectedValueOnce(new TypeError('simulated network failure'));

    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'test-token' }),
    );

    expect(response.status).toBe(502);
    expect(await readJson(response)).toEqual({ error: 'AI generation failed.' });
  });

  it.each([
    ['invalid JSON', new Response('{', { status: 200 })],
    ['empty output', jsonResponse({ result: { response: '   ' } })],
    ['oversized output', jsonResponse({ result: { response: 'x'.repeat(8_001) } })],
  ])('AIプロバイダの%sを502として扱う', async (_caseName, providerResponse) => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(providerResponse);

    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'test-token' }),
    );

    expect(response.status).toBe(502);
    expect(await readJson(response)).toEqual({ error: 'AI generation failed.' });
  });

  it('空回答の安全なレスポンス形式情報を記録する', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true })).mockResolvedValueOnce(
      jsonResponse({
        result: {
          choices: [
            {
              finish_reason: 'stop',
              message: { role: 'assistant', content: '', reasoning: 'internal reasoning' },
            },
          ],
        },
        success: true,
      }),
    );

    const response = await invoke(
      makeJsonRequest({ prompt: 'hello', turnstileToken: 'test-token' }),
    );

    expect(response.status).toBe(502);
    expect(console.error).toHaveBeenCalledWith('Cloudflare AI returned invalid output.', {
      outputLength: 0,
      responseShape: {
        topLevelKeys: ['result', 'success'],
        payloadKeys: ['choices'],
        responseType: 'undefined',
        responseLength: undefined,
        outputCount: 0,
        choiceCount: 1,
        finishReason: 'stop',
        messageKeys: ['role', 'content', 'reasoning'],
        contentType: 'string',
        contentLength: 0,
        reasoningType: 'string',
        reasoningLength: 18,
      },
    });
  });

  it('Turnstile検証後にCloudflare AIの生成結果を安全なJSONとして返す', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ result: { response: '  生成された物語  ' } }));

    const response = await invoke(
      makeJsonRequest(
        { prompt: 'テスト用プロンプト', turnstileToken: 'test-turnstile-token' },
        { 'CF-Connecting-IP': '203.0.113.10' },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await readJson(response)).toEqual({ text: '生成された物語' });

    const turnstileRequest = fetchMock.mock.calls[0];
    expect(turnstileRequest?.[0]).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const turnstileBody = turnstileRequest?.[1]?.body as URLSearchParams;
    expect(turnstileBody.get('secret')).toBe('test-turnstile-secret');
    expect(turnstileBody.get('response')).toBe('test-turnstile-token');
    expect(turnstileBody.get('remoteip')).toBe('203.0.113.10');

    expect(fetchMock.mock.calls[1]).toEqual([
      'https://api.cloudflare.com/client/v4/accounts/test-account-id/ai/run/@cf/qwen/qwen3.8-27b',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-api-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'テスト用プロンプト' }],
          max_completion_tokens: 2048,
          chat_template_kwargs: {
            enable_thinking: false,
          },
        }),
      }),
    ]);
  });
});
