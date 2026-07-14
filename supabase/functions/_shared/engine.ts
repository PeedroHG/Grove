/**
 * Mirror of src/shared/engine/allocateIncome.ts + isCardInvoicePayment.ts.
 *
 * Duplicated on purpose: Supabase Edge Functions run on Deno, and its
 * per-function bundler isn't reliable about resolving relative imports that
 * reach outside `supabase/functions/` into the rest of the repo. Rather than
 * ship a cross-runtime import that might silently break on `supabase
 * functions deploy` for someone else's install, this file is kept as a
 * deliberate, small, well-tested mirror. If you change the allocation logic,
 * change it in BOTH places — `src/shared/engine`'s test suite is the
 * reference; this copy has no independent tests of its own by design.
 */

export type AllocationMode = 'fixed' | 'percentage';

export interface AllocationRule {
  bucketId: string;
  mode: AllocationMode;
  value: number;
}

export interface FixedBucketFunding {
  bucketId: string;
  fundedCents: number;
}

export interface Allocation {
  bucketId: string;
  amountCents: number;
}

export const UNALLOCATED_BUCKET_ID = '__unallocated__';

export function allocateIncome(
  amountCents: number,
  rules: AllocationRule[],
  fundingState: FixedBucketFunding[],
): Allocation[] {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error(`amountCents must be a non-negative integer, got ${amountCents}`);
  }

  const totals = new Map<string, number>();
  const addTo = (bucketId: string, cents: number) => {
    if (cents <= 0) return;
    totals.set(bucketId, (totals.get(bucketId) ?? 0) + cents);
  };

  const fundedByBucket = new Map(fundingState.map((f) => [f.bucketId, f.fundedCents]));
  let remaining = amountCents;

  for (const rule of rules) {
    if (rule.mode !== 'fixed' || remaining <= 0) continue;
    const alreadyFunded = fundedByBucket.get(rule.bucketId) ?? 0;
    const gap = Math.max(0, rule.value - alreadyFunded);
    const take = Math.min(gap, remaining);
    if (take > 0) {
      addTo(rule.bucketId, take);
      remaining -= take;
      fundedByBucket.set(rule.bucketId, alreadyFunded + take);
    }
  }

  if (remaining > 0) {
    const excess = remaining;
    let claimed = 0;
    for (const rule of rules) {
      if (rule.mode !== 'percentage') continue;
      const amt = Math.floor((excess * rule.value) / 100);
      if (amt > 0) {
        addTo(rule.bucketId, amt);
        claimed += amt;
      }
    }
    remaining -= claimed;
  }

  if (remaining > 0) {
    addTo(UNALLOCATED_BUCKET_ID, remaining);
  }

  return Array.from(totals.entries()).map(([bucketId, cents]) => ({ bucketId, amountCents: cents }));
}

const INVOICE_PAYMENT_PATTERNS = [
  /pagamento.*fatura/i,
  /fatura.*cart[aã]o/i,
  /invoice payment/i,
  /credit card payment/i,
];

export function isCardInvoicePayment(description: string): boolean {
  return INVOICE_PAYMENT_PATTERNS.some((pattern) => pattern.test(description));
}
