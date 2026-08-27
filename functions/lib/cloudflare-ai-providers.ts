export type CloudflareAiProviderId = 'openai-gpt-oss' | 'qwen';

export interface CloudflareAiProvider {
  readonly id: CloudflareAiProviderId;
  supports(modelId: string): boolean;
  buildRequest(prompt: string): Record<string, unknown>;
  extractText(data: unknown): string;
}

const MAX_COMPLETION_TOKENS = 2_048;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const unwrapResult = (data: unknown): unknown =>
  isRecord(data) && data.result !== undefined ? data.result : data;

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

const extractChatCompletionText = (payload: unknown): string => {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return '';

  const firstChoice = payload.choices[0];
  const message = isRecord(firstChoice) ? firstChoice.message : undefined;
  const content = isRecord(message) ? message.content : undefined;
  return extractContentParts(content).trim();
};

const extractResponseText = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim();
  if (!isRecord(payload)) return '';

  if (typeof payload.response === 'string') {
    return payload.response.trim();
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) return '';

  return payload.output
    .map((item) => (isRecord(item) ? extractContentParts(item.content) : ''))
    .join('')
    .trim();
};

const qwenProvider: CloudflareAiProvider = {
  id: 'qwen',
  supports: (modelId) => modelId.startsWith('@cf/qwen/qwen3.8-'),
  buildRequest: (prompt) => ({
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    chat_template_kwargs: {
      enable_thinking: false,
    },
  }),
  extractText: (data) => extractChatCompletionText(unwrapResult(data)),
};

const openAiGptOssProvider: CloudflareAiProvider = {
  id: 'openai-gpt-oss',
  supports: (modelId) => modelId.startsWith('@cf/openai/gpt-oss-'),
  buildRequest: (prompt) => ({
    messages: [{ role: 'user', content: prompt }],
    max_tokens: MAX_COMPLETION_TOKENS,
  }),
  extractText: (data) => {
    const payload = unwrapResult(data);
    return extractResponseText(payload) || extractChatCompletionText(payload);
  },
};

const cloudflareAiProviders: readonly CloudflareAiProvider[] = [qwenProvider, openAiGptOssProvider];

export const resolveCloudflareAiProvider = (modelId: string): CloudflareAiProvider | undefined =>
  cloudflareAiProviders.find((provider) => provider.supports(modelId));
