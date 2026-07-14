import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { expenses } from '@/db/schema';

export function pendingExpensesQuery() {
  return db.select().from(expenses).where(eq(expenses.reviewStatus, 'pending'));
}
