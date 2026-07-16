import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { buckets, expenses, incomeEvents, incomeSources } from '@/db/schema';
import { colors } from '@/theme/tokens';

export interface ActivityItem {
  id: string;
  kind: 'income' | 'expense';
  label: string;
  sublabel: string;
  /** Signed: positive for income, negative for expense. */
  amountCents: number;
  color: string;
  icon: string;
  occurredAt: Date;
}

function recentExpensesQuery() {
  return db
    .select({
      id: expenses.id,
      description: expenses.description,
      amountCents: expenses.amountCents,
      occurredAt: expenses.occurredAt,
      bucketName: buckets.name,
      bucketColor: buckets.color,
      bucketIcon: buckets.icon,
    })
    .from(expenses)
    .innerJoin(buckets, eq(buckets.id, expenses.bucketId))
    .orderBy(desc(expenses.occurredAt))
    .limit(8);
}

function recentIncomeQuery() {
  return db
    .select({
      id: incomeEvents.id,
      amountCents: incomeEvents.amountCents,
      occurredAt: incomeEvents.occurredAt,
      sourceName: incomeSources.name,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
    .orderBy(desc(incomeEvents.occurredAt))
    .limit(8);
}

/** Merged, most-recent-first feed of expenses and income for the home. */
export function useRecentActivity(limit = 6): ActivityItem[] {
  const { data: expenseRows } = useLiveQuery(recentExpensesQuery());
  const { data: incomeRows } = useLiveQuery(recentIncomeQuery());

  return useMemo(() => {
    const items: ActivityItem[] = [
      ...(expenseRows ?? []).map((e) => ({
        id: e.id,
        kind: 'expense' as const,
        label: e.description || e.bucketName,
        sublabel: e.bucketName,
        amountCents: -Math.abs(e.amountCents),
        color: e.bucketColor,
        icon: e.bucketIcon,
        occurredAt: e.occurredAt,
      })),
      ...(incomeRows ?? []).map((i) => ({
        id: i.id,
        kind: 'income' as const,
        label: i.sourceName ?? 'Entrada',
        sublabel: 'Renda',
        amountCents: Math.abs(i.amountCents),
        color: colors.positive,
        icon: 'arrow-down',
        occurredAt: i.occurredAt,
      })),
    ];
    return items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, limit);
  }, [expenseRows, incomeRows, limit]);
}
