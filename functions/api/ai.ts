export interface Env {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  TURNSTILE_SECRET_KEY?: string;
  DEMO_MODEL_ID?: string;
}

const DEFAULT_DEMO_MODEL = '@cf/openai/gpt-oss-20b';
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_PROMPT_CHARS = 16_000;
const MAX_OUTPUT_CHARS = 8_000;

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

const buildJsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });

const buildErrorResponse = (message: string, status = 500) =>
  buildJsonResponse({ error: message }, status);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const extractContentParts = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';

  return value
    .map((part) => {
      if (!isRecord(part)) return '';
      if (part.type !== 'output_text' && part.type !== 'text') return '';
      return typeof part.text === 'string' ? part.text : '';
    })
    .join('');
};

const extractTextFromPayload = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim();
  if (!isRecord(payload)) return '';

  if (typeof payload.response === 'string') {
    return payload.response.trim();
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload.output)) {
    const text = payload.output
      .map((item) => (isRecord(item) ? extractContentParts(item.content) : ''))
      .join('')
      .trim();
    if (text) return text;
  }

  if (Array.isArray(payload.choices)) {
    const firstChoice = payload.choices[0];
    const message = isRecord(firstChoice) ? firstChoice.message : undefined;
    const content = isRecord(message) ? message.content : undefined;
    return extractContentParts(content).trim();
  }

  return '';
};

const extractGeneratedText = (data: unknown): string => {
  if (!isRecord(data)) return '';
  return extractTextFromPayload(data.result) || extractTextFromPayload(data);
};

const verifyTurnstile = async (
  token: string,
  secret: string,
  remoteIp: string,
): Promise<boolean> => {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    if (!response.ok) {
      console.error('Turnstile verification returned an error.', {
        status: response.status,
      });
      return false;
    }

    const result: unknown = await response.json();
    if (!isRecord(result) || result.success !== true) {
      console.error('Turnstile verification failed.', {
        errorCodes: isRecord(result) ? result['error-codes'] : undefined,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Turnstile verification request failed.', {
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    return false;
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return buildErrorResponse('Content-Type must be application/json.', 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return buildErrorResponse('Request body is too large.', 413);
  }

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return buildErrorResponse('Failed to read request body.', 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return buildErrorResponse('Request body is too large.', 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return buildErrorResponse('Invalid JSON body.', 400);
  }

  const prompt = isRecord(body) && typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return buildErrorResponse('Prompt is required.', 400);
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return buildErrorResponse('Prompt is too long.', 413);
  }

  const turnstileToken =
    isRecord(body) && typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (!turnstileToken) {
    return buildErrorResponse('Turnstile token is required.', 400);
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!turnstileSecret) {
    console.error('TURNSTILE_SECRET_KEY is missing.');
    return buildErrorResponse('Bot verification is not configured.');
  }

  const isHuman = await verifyTurnstile(
    turnstileToken,
    turnstileSecret,
    request.headers.get('CF-Connecting-IP') ?? '',
  );
  if (!isHuman) {
    return buildErrorResponse('Failed bot verification.', 403);
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!accountId) {
    console.error('CLOUDFLARE_ACCOUNT_ID is missing.');
    return buildErrorResponse('AI provider is not configured.');
  }

  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
  if (!apiToken) {
    console.error('CLOUDFLARE_API_TOKEN is missing.');
    return buildErrorResponse('AI provider is not configured.');
  }

  const modelId = env.DEMO_MODEL_ID?.trim() || DEFAULT_DEMO_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`;

  let cloudflareResponse: Response;
  try {
    cloudflareResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: prompt }),
    });
  } catch (error) {
    console.error('Cloudflare AI request failed.', {
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    return buildErrorResponse('AI generation failed.', 502);
  }

  if (!cloudflareResponse.ok) {
    console.error('Cloudflare AI returned an error.', {
      status: cloudflareResponse.status,
      rayId: cloudflareResponse.headers.get('cf-ray'),
    });
    return buildErrorResponse('AI generation failed.', 502);
  }

  let data: unknown;
  try {
    data = await cloudflareResponse.json();
  } catch {
    console.error('Cloudflare AI returned invalid JSON.');
    return buildErrorResponse('AI generation failed.', 502);
  }

  const generatedText = extractGeneratedText(data);
  if (!generatedText || generatedText.length > MAX_OUTPUT_CHARS) {
    console.error('Cloudflare AI returned invalid output.', {
      outputLength: generatedText.length,
    });
    return buildErrorResponse('AI generation failed.', 502);
  }

  return buildJsonResponse({ text: generatedText });
};
