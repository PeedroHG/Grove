import type { buckets } from '@/db/schema';

type BucketRow = Pick<typeof buckets.$inferSelect, 'kind' | 'fundingType'>;

/**
 * The three user-facing concepts, derived from the (kind, fundingType) pair —
 * no separate column needed. See the plan: bills are funded first, bolsos and
 * metas split whatever's left.
 *  - despesa: fixed obligation (internet, aluguel) — covered first
 *  - bolso:   discretionary spending from the leftover (namorada, lanches)
 *  - meta:    saving toward a goal, accumulates
 */
export type BucketType = 'despesa' | 'bolso' | 'meta';

export function bucketType(b: BucketRow): BucketType {
  if (b.kind === 'saving') return 'meta';
  return b.fundingType === 'fixed' ? 'despesa' : 'bolso';
}

export const BUCKET_TYPE_LABEL: Record<BucketType, string> = {
  despesa: 'Despesa',
  bolso: 'Bolso',
  meta: 'Meta',
};
