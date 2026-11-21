export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "INR", symbol: "₹", label: "INR ₹" },
  { code: "USD", symbol: "$", label: "USD $" },
  { code: "EUR", symbol: "€", label: "EUR €" },
  { code: "GBP", symbol: "£", label: "GBP £" },
];

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED ",
  JPY: "¥",
};

export function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

export function currencySymbol(currency: string): string {
  const code = normalizeCurrency(currency);
  return SYMBOLS[code] ?? `${code} `;
}

export function currencyLabel(currency: string): string {
  const code = normalizeCurrency(currency);
  const option = CURRENCY_OPTIONS.find((item) => item.code === code);
  return option ? option.label : code;
}

function isSupportedIsoCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: code });
    return /^[A-Z]{3}$/.test(code);
  } catch {
    return false;
  }
}

export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "Price not provided";
  }

  const code = normalizeCurrency(currency);
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  if (isSupportedIsoCurrency(code)) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
      })
        .format(amount)
        .replace(/[\u00a0\u202f]/g, " ");
    } catch {
      // Fall through to the plain label below.
    }
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

  return `${code} ${formatted}`;
}

export function formatBudgetRange(min: number, max: number, currency: string): string {
  return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
}
