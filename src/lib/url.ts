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
