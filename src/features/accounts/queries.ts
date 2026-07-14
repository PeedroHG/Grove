import { isNotNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { accounts } from '@/db/schema';

/** Bank-linked accounts (has a Pluggy item behind it) — the ones subject to Open Finance consent expiry. */
export function bankLinkedAccountsQuery() {
  return db.select().from(accounts).where(isNotNull(accounts.pluggyItemId));
}
