import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { allocationRules, incomeSources } from '@/db/schema';

export function incomeSourcesQuery() {
  return db.select().from(incomeSources).orderBy(incomeSources.createdAt);
}

/** Rules for a source, in creation order — the order the engine's cascata follows. */
export async function rulesForSource(incomeSourceId: string) {
  return db
    .select()
    .from(allocationRules)
    .where(eq(allocationRules.incomeSourceId, incomeSourceId))
    .orderBy(allocationRules.createdAt);
}
