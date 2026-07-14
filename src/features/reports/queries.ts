import { and, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { ledgerEntries } from '@/db/schema';
import { currentMonthRange } from '@/lib/date';

/** Spending per bucket this month, ranked highest first — the "onde foi meu dinheiro" view. */
export function monthlySpendByBucketQuery(reference: Date = new Date()) {
  const { start, end } = currentMonthRange(reference);
  return db
    .select({
      bucketId: ledgerEntries.bucketId,
      spentCents: sql<number>`coalesce(sum(-${ledgerEntries.amountCents}), 0)`.as('spentCents'),
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.entryType, 'expense'),
        gte(ledgerEntries.occurredAt, start),
        lte(ledgerEntries.occurredAt, end),
      ),
    )
    .groupBy(ledgerEntries.bucketId)
    .orderBy(sql`2 desc`);
}
