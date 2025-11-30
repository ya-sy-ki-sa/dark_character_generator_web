import { ProviderConfig } from '../types';

type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type OpenAIResponse = {
  choices?: {
    message?: OpenAIMessage;
  }[];
};

export const callOpenAI = async (prompt: string, providerConfig: ProviderConfig): Promise<string> => {
  const apiKey = providerConfig.apiKey?.trim();
  if (!apiKey) {
    throw new Error('OpenAI API key is missing.');
  }

  const model = providerConfig.model?.trim() || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ''
      }`
    );
  }

  const data: OpenAIResponse = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('OpenAI API returned an empty response.');
  }

  return content;
};
