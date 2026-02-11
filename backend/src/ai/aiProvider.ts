/**
 * Single AI provider: uses Hugging Face when API key is set, otherwise local mock (free, no key).
 * No configuration needed for the mock — the AI part works out of the box.
 */

import { HUGGINGFACE_API_KEY, HF_MODEL_ID } from "./hfClient";
import { directTextGeneration } from "./hfInferenceDirect";
import { localMockGenerate } from "./localMockAI";

export interface GenerateOptions {
  inputs: string;
  maxNewTokens?: number;
  temperature?: number;
}

/**
 * Generate a reply. Uses Hugging Face Inference API if HUGGINGFACE_API_KEY is set,
 * otherwise uses the local mock (no API key, free, works offline).
 */
export async function generateReply(options: GenerateOptions): Promise<string> {
  const { inputs, maxNewTokens = 256, temperature = 0.4 } = options;
  const apiKey = (HUGGINGFACE_API_KEY || "").trim();

  if (apiKey) {
    return directTextGeneration({
      modelId: HF_MODEL_ID,
      apiKey,
      inputs,
      maxNewTokens,
      temperature,
    });
  }

  return localMockGenerate(inputs);
}
