import { eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { buckets } from '@/db/schema';

/** Query builder (not awaited) — pass straight into useLiveQuery for reactivity. */
export function activeBucketsQuery() {
  return db.select().from(buckets).where(isNull(buckets.archivedAt)).orderBy(buckets.sortOrder);
}

export function bucketByIdQuery(id: string) {
  return db.select().from(buckets).where(eq(buckets.id, id));
}
