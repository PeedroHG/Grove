import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { ledgerEntries } from '@/db/schema';
import type { FixedBucketFunding } from '@/shared/engine';

/**
 * Balance per bucket = SUM(ledger_entries.amountCents) — never a stored
 * column. Query builder (not awaited): pass into useLiveQuery.
 */
export function bucketBalancesQuery() {
  return db
    .select({
      bucketId: ledgerEntries.bucketId,
      balanceCents: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`.as('balanceCents'),
    })
    .from(ledgerEntries)
    .groupBy(ledgerEntries.bucketId);
}

export function balanceQueryForBucket(bucketId: string) {
  return db
    .select({
      balanceCents: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`.as('balanceCents'),
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.bucketId, bucketId));
}

export function ledgerHistoryQuery(bucketId: string) {
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.bucketId, bucketId))
    .orderBy(sql`${ledgerEntries.occurredAt} desc`);
}

/**
 * How much each fixed bucket has already received via 'allocation' entries
 * within [start, end) — what `allocateIncome` needs as `fundingState` to
 * know how much of the monthly target is still uncovered.
 */
export async function monthFundingState(
  bucketIds: string[],
  range: { start: Date; end: Date },
): Promise<FixedBucketFunding[]> {
  if (bucketIds.length === 0) return [];

  const rows = await db
    .select({
      bucketId: ledgerEntries.bucketId,
      fundedCents: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`.as('fundedCents'),
    })
    .from(ledgerEntries)
    .where(
      and(
        inArray(ledgerEntries.bucketId, bucketIds),
        eq(ledgerEntries.entryType, 'allocation'),
        gte(ledgerEntries.occurredAt, range.start),
        lte(ledgerEntries.occurredAt, range.end),
      ),
    )
    .groupBy(ledgerEntries.bucketId);

  return rows;
}
