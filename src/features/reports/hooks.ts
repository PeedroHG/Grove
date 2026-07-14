import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

import { monthlySpendByBucketQuery } from './queries';

export function useMonthlySpendByBucket() {
  return useLiveQuery(monthlySpendByBucketQuery());
}
