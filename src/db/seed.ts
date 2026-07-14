import { eq } from 'drizzle-orm';

import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';

import type { Database } from './client';
import { accounts, buckets } from './schema';

export const CASH_ACCOUNT_ID = 'cash-wallet';

/**
 * Idempotent: creates only the two things every install needs regardless of
 * how the user configures their own buckets:
 *  - the manual "Carteira" account, used for cash entries (dinheiro vivo)
 *  - the "A distribuir" bucket, the engine's sentinel landing spot for money
 *    no allocation rule claimed (see UNALLOCATED_BUCKET_ID)
 * Real spending/saving buckets are NOT seeded here — those come from the
 * onboarding-coach interview, since the point of that flow is that bolsos
 * reflect this person's real fixed costs and goals, not a fixed category list.
 */
export async function runSeed(db: Database): Promise<void> {
  const existingAccount = await db.select().from(accounts).where(eq(accounts.id, CASH_ACCOUNT_ID));
  if (existingAccount.length === 0) {
    await db.insert(accounts).values({
      id: CASH_ACCOUNT_ID,
      name: 'Carteira',
      kind: 'cash',
    });
  }

  const existingBucket = await db
    .select()
    .from(buckets)
    .where(eq(buckets.id, UNALLOCATED_BUCKET_ID));
  if (existingBucket.length === 0) {
    await db.insert(buckets).values({
      id: UNALLOCATED_BUCKET_ID,
      name: 'A distribuir',
      color: '#a1a1aa',
      icon: 'help-circle',
      kind: 'spending',
      fundingType: 'percentage',
      isReserve: false,
      physicalLocation: 'checking',
      sortOrder: -1,
    });
  }
}
