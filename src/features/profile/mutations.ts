import { db } from '@/db/client';
import { profile } from '@/db/schema';

import { PROFILE_ID } from './queries';

export interface UpsertProfileInput {
  name: string;
  avatarUri?: string | null;
}

export async function upsertProfile(input: UpsertProfileInput): Promise<void> {
  await db
    .insert(profile)
    .values({ id: PROFILE_ID, name: input.name, avatarUri: input.avatarUri ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: profile.id,
      set: { name: input.name, avatarUri: input.avatarUri ?? null, updatedAt: new Date() },
    });
}
