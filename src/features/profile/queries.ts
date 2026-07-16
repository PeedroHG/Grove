import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

import { db } from '@/db/client';
import { profile } from '@/db/schema';

export const PROFILE_ID = 'me';

export function profileQuery() {
  return db.select().from(profile);
}

export function useProfile() {
  const { data } = useLiveQuery(profileQuery());
  return data?.[0] ?? null;
}
