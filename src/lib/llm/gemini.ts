import { buildUserPrompt, SYSTEM_PROMPT } from "./prompts";
import { parseGeneratedIdeas } from "./parse";
import { LlmError } from "./types";
import type { GeneratedIdea, IdeaGenerationInput, LlmProvider } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 25_000;

const IDEA_SCHEMA = {
  type: "OBJECT",
  properties: {
    ideas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          estimatedPrice: { type: "NUMBER" },
          currency: { type: "STRING" },
          whyItFits: { type: "STRING" },
          exactUrl: { type: "STRING" },
        },
        required: [
          "title",
          "description",
          "estimatedPrice",
          "currency",
          "whyItFits",
          "exactUrl",
        ],
      },
    },
  },
  required: ["ideas"],
} as const;

interface GeminiOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiOptions) {
    this.apiKey = options.apiKey;
    this.model = (options.model?.trim() || DEFAULT_MODEL).replace(/^models\//, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateIdeas(input: IdeaGenerationInput): Promise<GeneratedIdea[]> {
    const url = `${ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`;

    const body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildUserPrompt(input) }],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: IDEA_SCHEMA,
      },
    };

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
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

    let data: GeminiResponse;
    try {
      data = (await response.json()) as GeminiResponse;
    } catch {
      throw new LlmError("The gift provider returned an invalid response.");
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new LlmError("The gift provider returned an empty response.");
    }

    return parseGeneratedIdeas(text, input.count, input.brief.currency);
  }
}
