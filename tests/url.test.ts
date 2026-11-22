import { describe, expect, it } from "vitest";
import {
  buildSearchUrl,
  buildShopSearchUrl,
  safeExternalUrl,
  shopDomainForCurrency,
} from "@/lib/url";

describe("shop links", () => {
  it("maps currencies to a local Amazon storefront", () => {
    expect(shopDomainForCurrency("INR")).toBe("amazon.in");
    expect(shopDomainForCurrency("usd")).toBe("amazon.com");
    expect(shopDomainForCurrency("GBP")).toBe("amazon.co.uk");
    expect(shopDomainForCurrency("XYZ")).toBe("amazon.com");
  });

  it("builds an encoded retailer search URL with location context", () => {
    expect(buildShopSearchUrl("Stoneware Pour-Over Set", "INR", "Bengaluru")).toBe(
      "https://www.amazon.in/s?k=Stoneware%20Pour-Over%20Set%20Bengaluru",
    );
  });
});

describe("safe external URLs", () => {
  it("allows only http and https links", () => {
    expect(safeExternalUrl("https://example.com/gift")).toBe(
      "https://example.com/gift",
    );
    expect(safeExternalUrl("http://example.com/gift")).toBe("http://example.com/gift");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it("keeps the Google check-options fallback", () => {
    expect(buildSearchUrl("Brass Tray", "INR", "Pune")).toBe(
      "https://www.google.com/search?q=Brass%20Tray%20INR%20Pune%20buy",
    );
  });
});
