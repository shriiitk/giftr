import type { ActiveBrief } from "../types";

export interface IdeaGenerationInput {
  brief: ActiveBrief;
  count: number;
  slots: number[];
  excludeTitles: string[];
  seed?: string;
}

export interface GeneratedIdea {
  title: string;
  description: string;
  estimatedPrice: number | null;
  currency: string;
  whyItFits: string;
  exactUrl: string | null;
}

export interface LlmProvider {
  readonly name: string;
  generateIdeas(input: IdeaGenerationInput): Promise<GeneratedIdea[]>;
}

export class LlmError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

export class LlmConfigError extends LlmError {
  constructor(message: string) {
    super(message, 503);
    this.name = "LlmConfigError";
  }
}
