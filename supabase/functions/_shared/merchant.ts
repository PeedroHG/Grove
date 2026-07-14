/** Collapses "IFOOD *RESTAURANTE 123" and "iFood *Restaurante 456" to the same key. */
export function normalizeMerchant(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
