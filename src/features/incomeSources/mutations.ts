import { db } from '@/db/client';
import { allocationRules, incomeSources } from '@/db/schema';
import { newId } from '@/lib/id';
import { CASH_ACCOUNT_ID } from '@/db/seed';

export interface CreateIncomeSourceInput {
  name: string;
  accountId?: string;
  reliability: 'reliable' | 'sporadic';
  matchHint?: string;
  expectedMonthlyCents?: number;
  /** Rules created in this order become the cascata order the engine follows. */
  rules: Array<{ bucketId: string; mode: 'fixed' | 'percentage'; value: number }>;
}

export async function createIncomeSource(input: CreateIncomeSourceInput): Promise<string> {
  const id = newId();
  await db.insert(incomeSources).values({
    id,
    name: input.name,
    accountId: input.accountId ?? CASH_ACCOUNT_ID,
    reliability: input.reliability,
    matchHint: input.matchHint,
    expectedMonthlyCents: input.expectedMonthlyCents,
  });

  for (const rule of input.rules) {
    await db.insert(allocationRules).values({
      id: newId(),
      incomeSourceId: id,
      bucketId: rule.bucketId,
      mode: rule.mode,
      value: rule.value,
    });
  }

  return id;
}
