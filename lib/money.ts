const formatters = new Map<string, Intl.NumberFormat>();

export function formatPrice(cents: number, currency = "USD"): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
}
