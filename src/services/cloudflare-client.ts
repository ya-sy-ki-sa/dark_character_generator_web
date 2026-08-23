type CloudflareResponse = {
  text?: unknown;
};

export const callCloudflareAI = async (
  prompt: string,
  turnstileToken?: string
): Promise<string> => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, turnstileToken }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare AI proxy error: ${response.status} ${response.statusText}`);
  }

  let data: CloudflareResponse;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Failed to parse Cloudflare AI response as JSON: ${String(error)}`);
  }

  const content = typeof data.text === 'string' ? data.text.trim() : '';
  if (!content) {
    throw new Error('Cloudflare AI returned an empty response.');
  }

  return content;
};
