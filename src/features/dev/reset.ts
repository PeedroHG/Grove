import { db } from '@/db/client';
import { runSeed } from '@/db/seed';
import {
  allocationRules,
  billPayments,
  buckets,
  expenses,
  incomeEvents,
  incomeSources,
  ledgerEntries,
  merchantRules,
  profile,
  transfers,
} from '@/db/schema';

/**
 * Wipes all user data and re-seeds the baseline (cash account + "A distribuir"
 * bucket), so the app returns to a fresh pre-onboarding state. Local only —
 * this does not touch a synced Supabase copy. Meant for iterating on the
 * onboarding/UX during development.
 */
export async function resetAllData(): Promise<void> {
  await db.delete(billPayments);
  await db.delete(ledgerEntries);
  await db.delete(expenses);
  await db.delete(incomeEvents);
  await db.delete(transfers);
  await db.delete(allocationRules);
  await db.delete(merchantRules);
  await db.delete(incomeSources);
  await db.delete(buckets);
  await db.delete(profile);
  await runSeed(db);
}
