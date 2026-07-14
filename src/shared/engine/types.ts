export type AllocationMode = 'fixed' | 'percentage';

/** A single bucket's cut of income from one recognized source. */
export interface AllocationRule {
  bucketId: string;
  mode: AllocationMode;
  /**
   * `fixed`: monthly target in cents (e.g. internet = 10000).
   * `percentage`: percentage points applied to whatever is left after fixed
   * buckets are covered (e.g. 20 = 20%). Rules for the same source don't need
   * to sum to 100 — whatever isn't claimed flows to the unallocated bucket.
   */
  value: number;
}

/** How much a fixed bucket has already received this calendar month. */
export interface FixedBucketFunding {
  bucketId: string;
  fundedCents: number;
}

export interface Allocation {
  bucketId: string;
  amountCents: number;
}

/** Sentinel bucket id for money that didn't match any rule ("a distribuir"). */
export const UNALLOCATED_BUCKET_ID = '__unallocated__';
