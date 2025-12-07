export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  TURNSTILE_SECRET_KEY: string;
  DEMO_MODEL_ID?: string;
}

const DEFAULT_DEMO_MODEL = '@cf/openai/gpt-oss-20b';

const buildErrorResponse = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let prompt = '';
  let turnstileToken = '';
  try {
    const body = await request.json();
    if (body && typeof body.prompt === 'string') {
      prompt = body.prompt;
    }
    if (body && typeof body.turnstileToken === 'string') {
      turnstileToken = body.turnstileToken;
    }
  } catch (error) {
    console.error('Failed to parse request body', error);
    return buildErrorResponse('Invalid JSON body.', 400);
  }

  if (!prompt.trim()) {
    return buildErrorResponse('Prompt is required.', 400);
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!turnstileSecret) {
    console.error('TURNSTILE_SECRET_KEY is missing.');
    return buildErrorResponse('Turnstile secret key is not configured.');
  }

  if (!turnstileToken) {
    return buildErrorResponse('Turnstile token is required.', 400);
  }

  const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: turnstileSecret,
      response: turnstileToken,
      remoteip: request.headers.get('CF-Connecting-IP') ?? '',
    }),
  });

  type TurnstileVerifyResult = { success: boolean; 'error-codes'?: unknown };
  const verificationResult: TurnstileVerifyResult = await verification.json().catch(() => ({ success: false }));

  if (!verificationResult.success) {
    console.error('Turnstile verification failed.', verificationResult['error-codes']);
    return buildErrorResponse('Failed bot verification.', 403);
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!accountId) {
    console.error('CLOUDFLARE_ACCOUNT_ID is missing.');
    return buildErrorResponse('Cloudflare account ID is not configured.');
  }

  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
  if (!apiToken) {
    console.error('CLOUDFLARE_API_TOKEN is missing.');
    return buildErrorResponse('Cloudflare API token is not configured.');
  }

  const modelId = env.DEMO_MODEL_ID?.trim() || DEFAULT_DEMO_MODEL;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`;

  const cfResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Workers AI の openai/gpt 系モデルは `input` を受け取るシンプルな形式のみをサポートする。
      // `messages` を渡すと Cloudflare 側で oneOf バリデーションエラーとなるため、
      // プロンプト文字列をそのまま input に設定する。
      input: prompt,
    }),
  });

  const contentType = cfResponse.headers.get('Content-Type');

  if (!cfResponse.ok) {
    const errorText = await cfResponse.text().catch(() => '');
    const message = errorText || cfResponse.statusText || 'Unknown error';
    return buildErrorResponse(`Cloudflare AI API error: ${message}`, cfResponse.status);
  }

  if (contentType?.includes('application/json')) {
    const data = await cfResponse.json();
    return new Response(JSON.stringify(data), {
      status: cfResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fallbackText = await cfResponse.text().catch(() => '');
  return new Response(JSON.stringify({ result: fallbackText }), {
    status: cfResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
