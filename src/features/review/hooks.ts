import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

import { pendingExpensesQuery } from './queries';

export function usePendingExpenses() {
  return useLiveQuery(pendingExpensesQuery());
}
