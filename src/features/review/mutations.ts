import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { expenses, ledgerEntries, merchantRules } from '@/db/schema';
import { normalizeMerchant } from '@/lib/merchant';
import { newId } from '@/lib/id';

export interface ConfirmExpenseReviewInput {
  expenseId: string;
  bucketId: string;
}

/**
 * Assigns the real bucket to a Pluggy-imported expense that arrived as
 * `pending` (low confidence — see the webhook's merchant_rules lookup),
 * books the ledger debit only now that a bucket is known, and teaches
 * merchant_rules so the same merchant auto-categorizes next time.
 */
export async function confirmExpenseReview({ expenseId, bucketId }: ConfirmExpenseReviewInput): Promise<void> {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) throw new Error(`Expense ${expenseId} not found`);

  const now = new Date();

  await db
    .update(expenses)
    .set({ bucketId, reviewStatus: 'confirmed', updatedAt: now })
    .where(eq(expenses.id, expenseId));

  await db.insert(ledgerEntries).values({
    id: newId(),
    bucketId,
    amountCents: -Math.abs(expense.amountCents),
    entryType: 'expense',
    eventType: 'expense',
    eventId: expenseId,
    occurredAt: expense.occurredAt,
  });

  if (expense.merchantRaw) {
    const merchantNormalized = normalizeMerchant(expense.merchantRaw);
    const [existing] = await db
      .select()
      .from(merchantRules)
      .where(eq(merchantRules.merchantNormalized, merchantNormalized));

    if (existing) {
      await db
        .update(merchantRules)
        .set({ bucketId, hitCount: existing.hitCount + 1, updatedAt: now })
        .where(eq(merchantRules.id, existing.id));
    } else {
      await db.insert(merchantRules).values({
        id: newId(),
        merchantNormalized,
        bucketId,
        hitCount: 1,
      });
    }
  }
}
