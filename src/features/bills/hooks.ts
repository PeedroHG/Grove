import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { billPayments } from '@/db/schema';
import { monthKey } from '@/lib/date';

export type BillStatus = 'paid' | 'due' | 'overdue';

export interface BillState {
  paid: boolean;
  status: BillStatus;
  dueDay: number | null;
}

function paymentsThisMonthQuery(mk: string) {
  return db.select().from(billPayments).where(eq(billPayments.monthKey, mk));
}

/** Set of bucketIds that have a payment recorded for the current month. */
export function usePaidBillIds(): Set<string> {
  const mk = monthKey();
  const { data } = useLiveQuery(paymentsThisMonthQuery(mk), [mk]);
  return useMemo(() => new Set((data ?? []).map((p) => p.bucketId)), [data]);
}

/** Derives a bill's status for the current month from its dueDay + paid set. */
export function billState(dueDay: number | null, paid: boolean, today: Date = new Date()): BillState {
  if (paid) return { paid: true, status: 'paid', dueDay };
  const overdue = dueDay != null && today.getDate() > dueDay;
  return { paid: false, status: overdue ? 'overdue' : 'due', dueDay };
}
