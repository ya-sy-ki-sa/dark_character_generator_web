export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

const CLOUD_FLARE_MODEL = '@cf/openai/gpt-oss-20b';

const buildErrorResponse = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let prompt = '';
  try {
    const body = await request.json();
    if (body && typeof body.prompt === 'string') {
      prompt = body.prompt;
    }
  } catch (error) {
    console.error('Failed to parse request body', error);
    return buildErrorResponse('Invalid JSON body.', 400);
  }

  if (!prompt.trim()) {
    return buildErrorResponse('Prompt is required.', 400);
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

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUD_FLARE_MODEL}`;

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
