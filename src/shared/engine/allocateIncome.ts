import type {
  Allocation,
  AllocationRule,
  FixedBucketFunding,
} from './types';
import { UNALLOCATED_BUCKET_ID } from './types';

/**
 * Splits one income event across a source's buckets.
 *
 * Cascata de segurança: fixed buckets (rent, gas...) are topped up to their
 * monthly target first, in rule order, before anything else — so a stray
 * freela that lands before the salary still protects the fixed costs.
 * Whatever is left after fixed buckets are covered is split by percentage;
 * anything percentages don't claim (they needn't sum to 100, and integer
 * rounding always leaves a remainder) falls into `UNALLOCATED_BUCKET_ID`
 * ("a distribuir") rather than being silently dropped.
 *
 * Invariant: the returned allocations always sum to exactly `amountCents`.
 */
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

  // Pass 1 — fixed buckets, in rule order, each topped up to its monthly target.
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

  // Pass 2 — percentage buckets split whatever is left over.
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

  // Whatever no rule claimed (percentages under 100%, rounding remainder,
  // or a source with no rules at all) waits to be given a purpose.
  if (remaining > 0) {
    addTo(UNALLOCATED_BUCKET_ID, remaining);
  }

  return Array.from(totals.entries()).map(([bucketId, amountCents]) => ({
    bucketId,
    amountCents,
  }));
}
