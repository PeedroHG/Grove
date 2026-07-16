import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { billPayments, buckets } from '@/db/schema';
import { monthKey } from '@/lib/date';
import { newId } from '@/lib/id';

/**
 * Marks a despesa as paid for the current month. This is an acknowledgment
 * flag only — it does NOT book a ledger expense, so it never double-counts
 * the real payment that arrives via manual entry or Pluggy.
 */
export async function markBillPaid(bucketId: string, amountCents = 0): Promise<void> {
  const mk = monthKey();
  const existing = await db
    .select()
    .from(billPayments)
    .where(and(eq(billPayments.bucketId, bucketId), eq(billPayments.monthKey, mk)));
  if (existing.length > 0) return;

  await db.insert(billPayments).values({
    id: newId(),
    bucketId,
    monthKey: mk,
    amountCents,
    paidAt: new Date(),
  });
}

export async function unmarkBillPaid(bucketId: string): Promise<void> {
  const mk = monthKey();
  await db
    .delete(billPayments)
    .where(and(eq(billPayments.bucketId, bucketId), eq(billPayments.monthKey, mk)));
}

export async function setBucketDueDay(bucketId: string, dueDay: number | null): Promise<void> {
  await db.update(buckets).set({ dueDay, updatedAt: new Date() }).where(eq(buckets.id, bucketId));
}
