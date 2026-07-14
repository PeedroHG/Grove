import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

import { activeBucketsQuery } from './queries';

export function useActiveBuckets() {
  return useLiveQuery(activeBucketsQuery());
}
