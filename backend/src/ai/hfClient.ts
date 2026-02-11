const apiKey = process.env.HUGGINGFACE_API_KEY || "";

export const HUGGINGFACE_API_KEY = apiKey;

// Any model that supports text-generation on the Hub and is allowed by your
// Inference Provider rules on https://huggingface.co/settings/inference will work here.
export const HF_MODEL_ID = process.env.HF_MODEL_ID || "google/flan-t5-base";

// Log once at startup so we can verify env loading & model name in the backend terminal.
console.log(
  "[hfClient] HUGGINGFACE_API_KEY present:",
  Boolean(HUGGINGFACE_API_KEY),
  "| HF_MODEL_ID:",
  HF_MODEL_ID,
);

