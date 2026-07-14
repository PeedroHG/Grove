import type { buckets } from '@/db/schema';

type Bucket = typeof buckets.$inferSelect;

export interface BucketWithBalance extends Bucket {
  balanceCents: number;
}

export function mergeBucketsWithBalances(
  bucketRows: Bucket[],
  balanceRows: Array<{ bucketId: string; balanceCents: number }>,
): BucketWithBalance[] {
  const balanceByBucket = new Map(balanceRows.map((b) => [b.bucketId, b.balanceCents]));
  return bucketRows.map((bucket) => ({
    ...bucket,
    balanceCents: balanceByBucket.get(bucket.id) ?? 0,
  }));
}
