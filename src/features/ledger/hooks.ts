import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

import { balanceQueryForBucket, bucketBalancesQuery, ledgerHistoryQuery } from './queries';

export function useBucketBalances() {
  return useLiveQuery(bucketBalancesQuery());
}

export function useBucketBalance(bucketId: string) {
  return useLiveQuery(balanceQueryForBucket(bucketId), [bucketId]);
}

export function useLedgerHistory(bucketId: string) {
  return useLiveQuery(ledgerHistoryQuery(bucketId), [bucketId]);
}
