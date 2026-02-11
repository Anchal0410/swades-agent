/**
 * Direct HTTP client for Hugging Face *router* API using the
 * OpenAI-compatible chat completions endpoint.
 *
 * Endpoint: https://router.huggingface.co/v1/chat/completions
 * Docs:     https://huggingface.co/docs/inference-providers/tasks/text-generation
 */

const HF_ROUTER_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

export interface DirectTextGenOptions {
  modelId: string;
  apiKey: string;
  inputs: string;
  maxNewTokens?: number;
  temperature?: number;
}

/**
 * Generate text via Hugging Face router chat-completions API.
 * Returns the full generated text from choices[0].message.content.
 */
export async function directTextGeneration(options: DirectTextGenOptions): Promise<string> {
  const { modelId, apiKey, inputs, maxNewTokens = 256, temperature = 0.4 } = options;

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is required for inference.");
  }

  const body = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: inputs,
      },
    ],
    max_tokens: maxNewTokens,
    temperature,
    stream: false,
  };

  const res = await fetch(HF_ROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `[HF router] HTTP ${res.status}: ${text}`;
    if (res.status === 503) {
      message =
        "[HF router] Model is loading or provider is warming up. Retry in a few seconds; if it persists, try another model or adjust your inference rules.";
    }
    if (res.status === 401) {
      message = "[HF router] Invalid or missing HUGGINGFACE_API_KEY (check token and permissions).";
    }
    if (res.status === 404) {
      message = `[HF router] Model '${modelId}' not found or not enabled for your inference provider rules. Check the model id and your token's Inference settings.`;
    }
    throw new Error(message);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Hugging Face API returned invalid JSON.");
  }

  // Router chat-completions shape: { choices: [ { message: { content: string } } ] }
  if (!data || typeof data !== "object" || !("choices" in data)) {
    throw new Error(
      "[HF router] Unexpected response shape (no choices). Response: " + JSON.stringify(data).slice(0, 300),
    );
  }

  const choices = (data as any).choices;
  const content: unknown = choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error(
      "[HF router] Missing choices[0].message.content in response. Response: " + JSON.stringify(data).slice(0, 300),
    );
  }

  return content.trim();
}
