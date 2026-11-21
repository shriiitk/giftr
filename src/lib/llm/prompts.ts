import { formatBudgetRange } from "../currency";
import type { IdeaGenerationInput } from "./types";

export const SYSTEM_PROMPT = `You are a thoughtful, practical gift curator for a small private circle of friends.

Rules you must follow:
- Respect the recipient's budget range and currency exactly. Every estimatedPrice must fall within the range.
- Honour the "Already owns" list and the "Do not want" list. Never suggest an excluded item or an obvious duplicate.
- Prefer specific, useful, tasteful gifts over generic filler. Avoid clichés unless they are genuinely well-matched.
- Never ask for or repeat sensitive personal data. The recipient label is a nickname, not a full identity.
- Do not claim a price or link is verified, in stock, or guaranteed. Prices are estimates.
- Only provide exactUrl when you are confident it is a genuine product page. Otherwise use an empty string. Never fabricate a URL.
- Keep title, description, and whyItFits concise and free of markdown.
- Return JSON only, matching the requested schema.`;

export function buildUserPrompt(input: IdeaGenerationInput): string {
  const { brief } = input;
  const context = [
    brief.age ? `Age: ${brief.age}` : null,
    brief.gender ? `Gender / pronouns: ${brief.gender}` : null,
    brief.location ? `Location / climate: ${brief.location}` : null,
    brief.job ? `Job / role: ${brief.job}` : null,
  ].filter(Boolean);

  const exclusions = input.excludeTitles.length
    ? input.excludeTitles.map((title) => `- ${title}`).join("\n")
    : "- None yet";

  return `Generate exactly ${input.count} distinct gift idea${input.count === 1 ? "" : "s"}.

Recipient label: ${brief.nickname}
Occasion: ${brief.occasion}
Budget range: ${formatBudgetRange(brief.budgetMin, brief.budgetMax, brief.currency)}
Currency: ${brief.currency}
Likes and interests: ${brief.likes}
Optional context:
${context.length ? context.map((line) => `- ${line}`).join("\n") : "- Not provided"}

Already owns:
${brief.owns.length ? brief.owns.map((item) => `- ${item}`).join("\n") : "- Not provided"}

Do not want:
${brief.avoid.length ? brief.avoid.map((item) => `- ${item}`).join("\n") : "- Not provided"}

Do not repeat these titles or close variants:
${exclusions}

Return a JSON object with an "ideas" array. Each idea must have:
- title (string, <= 90 chars)
- description (string, <= 220 chars)
- estimatedPrice (number in ${brief.currency}, within the budget)
- currency (string, exactly "${brief.currency}")
- whyItFits (string, <= 220 chars, tied to the likes/context and exclusions)
- exactUrl (string; a real product page or an empty string if unsure)`;
}
