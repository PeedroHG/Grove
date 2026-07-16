import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

import { db } from '@/db/client';
import { buckets, incomeEvents, ledgerEntries } from '@/db/schema';
import { currentMonthRange } from '@/lib/date';

function incomeThisMonthQuery(start: Date, end: Date) {
  return db
    .select({ total: sql<number>`coalesce(sum(${incomeEvents.amountCents}), 0)`.as('total') })
    .from(incomeEvents)
    .where(and(gte(incomeEvents.occurredAt, start), lte(incomeEvents.occurredAt, end)));
}

function spentThisMonthQuery(start: Date, end: Date) {
  return db
    .select({ total: sql<number>`coalesce(sum(-${ledgerEntries.amountCents}), 0)`.as('total') })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.entryType, 'expense'),
        gte(ledgerEntries.occurredAt, start),
        lte(ledgerEntries.occurredAt, end),
      ),
    );
}

function savedThisMonthQuery(start: Date, end: Date) {
  return db
    .select({ total: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`.as('total') })
    .from(ledgerEntries)
    .innerJoin(buckets, eq(buckets.id, ledgerEntries.bucketId))
    .where(
      and(
        eq(ledgerEntries.entryType, 'allocation'),
        eq(buckets.kind, 'saving'),
        gte(ledgerEntries.occurredAt, start),
        lte(ledgerEntries.occurredAt, end),
      ),
    );
}

export interface MonthlyStats {
  incomeCents: number;
  spentCents: number;
  savedCents: number;
}

/** Entrou / saiu / guardei no mês corrente — reativo via live queries. */
export function useMonthlyStats(): MonthlyStats {
  const { start, end } = currentMonthRange();
  const income = useLiveQuery(incomeThisMonthQuery(start, end));
  const spent = useLiveQuery(spentThisMonthQuery(start, end));
  const saved = useLiveQuery(savedThisMonthQuery(start, end));

  return {
    incomeCents: income.data?.[0]?.total ?? 0,
    spentCents: spent.data?.[0]?.total ?? 0,
    savedCents: saved.data?.[0]?.total ?? 0,
  };
}
