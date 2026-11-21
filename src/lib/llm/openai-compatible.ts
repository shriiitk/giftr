import { buildUserPrompt, SYSTEM_PROMPT } from "./prompts";
import { parseGeneratedIdeas } from "./parse";
import { LlmError } from "./types";
import type { GeneratedIdea, IdeaGenerationInput, LlmProvider } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const TIMEOUT_MS = 25_000;

interface OpenAiOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

/**
 * Adapter for OpenAI-compatible chat-completions endpoints. Useful for swapping
 * in another provider (Groq, Together, a local gateway, etc.) without touching
 * the route handler or UI.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = "openai-compatible";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.model = options.model?.trim() || DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateIdeas(input: IdeaGenerationInput): Promise<GeneratedIdea[]> {
    const body = {
      model: this.model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new LlmError("The gift provider timed out. Please try again.");
      }
      throw new LlmError("Could not reach the gift provider. Please try again.");
    }

    if (!response.ok) {
      throw new LlmError(
        `The gift provider rejected the request (status ${response.status}).`,
      );
    }

    let data: ChatCompletionResponse;
    try {
      data = (await response.json()) as ChatCompletionResponse;
    } catch {
      throw new LlmError("The gift provider returned an invalid response.");
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new LlmError("The gift provider returned an empty response.");
    }

    return parseGeneratedIdeas(text, input.count, input.brief.currency);
  }
}
