import { GeminiProvider } from "./gemini";
import { OpenAiCompatibleProvider } from "./openai-compatible";
import { StubProvider } from "./stub";
import { LlmConfigError } from "./types";
import type { LlmProvider } from "./types";

export interface ProviderEnv {
  LLM_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
}

export function getProvider(
  env: ProviderEnv = {
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  },
): LlmProvider {
  const selected = (env.LLM_PROVIDER ?? "gemini").trim().toLowerCase();

  if (selected === "stub") {
    return new StubProvider();
  }

  if (selected === "gemini") {
    if (!env.GEMINI_API_KEY) {
      throw new LlmConfigError(
        "GEMINI_API_KEY is not configured. Set it on the server or use LLM_PROVIDER=stub for a local demo.",
      );
    }
    return new GeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    });
  }

  if (selected === "openai" || selected === "openai-compatible") {
    if (!env.OPENAI_API_KEY) {
      throw new LlmConfigError(
        "OPENAI_API_KEY is not configured for the OpenAI-compatible provider.",
      );
    }
    return new OpenAiCompatibleProvider({
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL,
    });
  }

  throw new LlmConfigError(
    `Unknown LLM_PROVIDER "${selected}". Use gemini, openai, or stub.`,
  );
}
