export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildSearchUrl(
  title: string,
  currency: string,
  location?: string,
): string {
  const query = [title, currency, location, "buy"]
    .filter((part) => Boolean(part && part.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

const SHOP_DOMAINS: Record<string, string> = {
  INR: "amazon.in",
  USD: "amazon.com",
  GBP: "amazon.co.uk",
  EUR: "amazon.de",
  AUD: "amazon.com.au",
  CAD: "amazon.ca",
  SGD: "amazon.sg",
  AED: "amazon.ae",
  JPY: "amazon.co.jp",
};

export function shopDomainForCurrency(currency: string): string {
  const code = currency.trim().toUpperCase();
  return SHOP_DOMAINS[code] ?? "amazon.com";
}

/**
 * Retailer search fallback for when the model does not return a product page.
 * Prices are estimates, so this opens a live retailer search rather than
 * pretending the app has a verified price source.
 */
export function buildShopSearchUrl(
  title: string,
  currency: string,
  location?: string,
): string {
  const query = [title, location]
    .filter((part) => Boolean(part && part.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `https://www.${shopDomainForCurrency(currency)}/s?k=${encodeURIComponent(query)}`;
}
