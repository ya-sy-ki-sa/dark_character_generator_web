import { ProviderConfig } from "../types";

type CloudflareResponse = {
  result?: {
    response?: unknown;
    output_text?: unknown;
    output?: { content?: unknown }[];
  };
  choices?: {
    message?: {
      content?: unknown;
    };
  }[];
};

const toText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toText).join("");
  }

  if (value && typeof value === "object") {
    const candidate = value as { text?: unknown; content?: unknown };
    return `${toText(candidate.text)}${toText(candidate.content)}`;
  }

  return "";
};

const extractContent = (data: CloudflareResponse): string | undefined => {
  const choiceContent = data.choices?.[0]?.message?.content;
  const choiceText = toText(choiceContent).trim();
  if (choiceText) {
    return choiceText;
  }

  const responseText = toText(data.result?.response).trim();
  if (responseText) {
    return responseText;
  }

  const outputItems = data.result?.output;
  if (Array.isArray(outputItems)) {
    const texts = outputItems
      .map((item) => {
        const content = (item as { content?: unknown }).content;
        const first = Array.isArray(content) ? content[0] : content;
        return first as { text?: unknown; type?: unknown } | undefined;
      })
      .filter((content) => content?.type === "output_text")
      .map((content) => toText(content?.text))
      .map((text) => text.trim())
      .filter(Boolean);

    if (texts.length > 0) {
      return texts[texts.length - 1];
    }
  }

  const outputText = toText(data.result?.output_text).trim();
  if (outputText) {
    return outputText;
  }

  return undefined;
};

export const callCloudflareAI = async (
  prompt: string,
  _providerConfig?: ProviderConfig
): Promise<string> => {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Cloudflare AI proxy error: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`
    );
  }

  let data: CloudflareResponse;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      `Failed to parse Cloudflare AI response as JSON: ${String(error)}`
    );
  }

  const content = extractContent(data);

  if (!content) {
    throw new Error("Cloudflare AI returned an empty response.");
  }

  return content;
};
