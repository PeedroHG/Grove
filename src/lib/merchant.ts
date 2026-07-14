/**
 * Mirrors supabase/functions/_shared/merchant.ts — kept in the app too
 * because the review queue needs to compute the same normalized key
 * on-device when teaching a new merchant_rules row from a confirmation.
 */
export function normalizeMerchant(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
