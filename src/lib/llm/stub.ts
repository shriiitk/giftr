import type { GeneratedIdea, IdeaGenerationInput, LlmProvider } from "./types";

interface StubSeed {
  title: string;
  description: string;
  why: string;
  fraction: number;
}

const POOL: StubSeed[] = [
  {
    title: "Hand-thrown Stoneware Pour-Over Set",
    description:
      "A speckled ceramic dripper and matching carafe for a slower, more tactile morning ritual.",
    why: "Speaks to a love of coffee rituals and warm, handmade objects without adding clutter.",
    fraction: 0.62,
  },
  {
    title: "Brass & Walnut Desk Tray",
    description:
      "A weighted solid-brass catch-all on an oiled walnut base for pens, keys, and small daily tools.",
    why: "Matches an appreciation for tactile stationery and warm desk accents.",
    fraction: 0.48,
  },
  {
    title: "Lay-Flat Cotton Notebook Trio",
    description:
      "Three Japanese cotton-paper notebooks that open flat and pair beautifully with gel or fountain pens.",
    why: "A quiet upgrade for journaling, studio notes, or weekend planning.",
    fraction: 0.3,
  },
  {
    title: "Warm Amber Cordless Table Lamp",
    description:
      "A compact rechargeable lamp with three warm dimming levels for cozy evening reading.",
    why: "Creates soft, warm light for reading corners without taking up much space.",
    fraction: 0.85,
  },
  {
    title: "Single-Origin Coffee Tasting Flight",
    description:
      "Four small-batch whole-bean bags selected for clean, bright pour-over clarity.",
    why: "Consumable, fresh, and tailored to an existing coffee habit.",
    fraction: 0.4,
  },
  {
    title: "Linen & Felt Desk Mat",
    description:
      "A soft merino-blend felt pad that frames a keyboard, notebook, and morning coffee.",
    why: "Warms up a workspace and protects the desk without feeling generic.",
    fraction: 0.72,
  },
  {
    title: "Etched Brass Page Markers",
    description:
      "A set of slim, hand-finished brass bookmarks with a small linen storage pouch.",
    why: "A thoughtful companion for a weekend reading stack and easy to keep.",
    fraction: 0.22,
  },
  {
    title: "Indoor Herb Starter Kit",
    description:
      "Three compact ceramic pots with basil, mint, and thyme seeds plus a simple care card.",
    why: "Brings a little life to a kitchen windowsill and suits hosting-minded homes.",
    fraction: 0.55,
  },
  {
    title: "Linen Table Runner & Napkin Set",
    description:
      "A washed-linen runner with four matching napkins in a soft, versatile neutral.",
    why: "Useful for casual dinners and easy to fold away when not hosting.",
    fraction: 0.68,
  },
  {
    title: "Compact Packing Cube Set",
    description:
      "Four lightweight, compression-style cubes sized for a weekend carry-on.",
    why: "Makes short trips calmer and pairs well with an organized travel routine.",
    fraction: 0.35,
  },
  {
    title: "Merino Travel Wrap",
    description:
      "A packable fine-merino wrap that works as a scarf, shoulder layer, or in-flight blanket.",
    why: "Warm, versatile, and genuinely useful across seasons and trips.",
    fraction: 0.9,
  },
  {
    title: "Ceramic Serving Bowl Duo",
    description:
      "Two low, wide stoneware bowls in a matte oatmeal glaze for shared dinners and salads.",
    why: "Hosting-friendly and easy to use without demanding special care.",
    fraction: 0.58,
  },
];

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function priceFor(input: IdeaGenerationInput, fraction: number): number | null {
  const { budgetMin, budgetMax } = input.brief;
  if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMax <= 0) {
    return null;
  }
  const span = Math.max(0, budgetMax - budgetMin);
  const raw = budgetMin + span * fraction;
  const rounded = Math.round(raw / 10) * 10;
  return Math.min(budgetMax, Math.max(budgetMin, rounded));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deterministic local provider used for demos and tests. It never calls a
 * network service and respects the requested count, exclusions, and budget.
 */
export class StubProvider implements LlmProvider {
  readonly name = "stub";

  async generateIdeas(input: IdeaGenerationInput): Promise<GeneratedIdea[]> {
    const excluded = new Set(
      input.excludeTitles.map((title) => title.trim().toLowerCase()),
    );
    const available = POOL.filter((seed) => !excluded.has(seed.title.toLowerCase()));
    const source = available.length >= input.count ? available : POOL;

    const offset =
      hashSeed(
        `${input.seed ?? ""}|${input.brief.nickname}|${input.slots.join(",")}`,
      ) % source.length;

    return Array.from({ length: input.count }, (_, index) => {
      const seed = source[(offset + index) % source.length];
      const price = priceFor(input, seed.fraction);
      return {
        title: seed.title,
        description: seed.description,
        whyItFits: seed.why,
        estimatedPrice: price,
        currency: input.brief.currency,
        exactUrl: `https://example.com/gifts/${slugify(seed.title)}`,
      };
    });
  }
}
