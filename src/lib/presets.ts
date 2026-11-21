import type { BriefFormState } from "./types";

export interface QuickPreset {
  id: string;
  label: string;
  emoji: string;
  values: Partial<BriefFormState>;
}

export const OCCASION_OPTIONS = [
  "Birthday",
  "Housewarming",
  "Thank You",
  "Festive / Holiday",
  "Just Because",
] as const;

export const ALREADY_OWNS_OPTIONS = [
  "Wireless earbuds",
  "Smartwatch",
  "Books / Kindle",
  "Basic ceramic mug",
  "Scented candles",
  "Canvas tote bag",
  "French press",
  "Mechanical keyboard",
] as const;

export const DO_NOT_WANT_OPTIONS = [
  "Gift cards",
  "Dust collector decor",
  "Fragile glassware",
  "Gag / novelty gifts",
  "Sizing / clothes",
  "Subscriptions",
  "Scented candles",
  "Generic mugs",
] as const;

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "coffee",
    label: "Coffee & desk fan",
    emoji: "☕",
    values: {
      nickname: "The Coffee Purist",
      occasion: "Birthday",
      currency: "INR",
      budgetMin: "1500",
      budgetMax: "4000",
      likes:
        "Pour-over coffee rituals, tactile stationery, warm brass desk accents, quiet weekend reading",
      location: "Bengaluru",
      job: "Product designer",
      owns: ["French press", "Books / Kindle"],
      avoid: ["Scented candles", "Gift cards"],
    },
  },
  {
    id: "apartment",
    label: "New apartment host",
    emoji: "🪴",
    values: {
      nickname: "New Apartment Host",
      occasion: "Housewarming",
      currency: "INR",
      budgetMin: "2500",
      budgetMax: "6000",
      likes:
        "Hosting casual dinners, linen table runners, indoor herbs, ceramic serving bowls",
      location: "Mumbai",
      job: "Architect",
      owns: ["Basic ceramic mug", "Canvas tote bag"],
      avoid: ["Fragile glassware", "Dust collector decor"],
    },
  },
  {
    id: "traveler",
    label: "Weekend traveler",
    emoji: "🧳",
    values: {
      nickname: "Weekend Traveler",
      occasion: "Thank You",
      currency: "INR",
      budgetMin: "1200",
      budgetMax: "3500",
      likes:
        "Carry-on organization, compact analog cameras, merino wool layers, airport coffee",
      location: "Delhi",
      job: "Consultant",
      owns: ["Wireless earbuds"],
      avoid: ["Subscriptions", "Sizing / clothes"],
    },
  },
];
