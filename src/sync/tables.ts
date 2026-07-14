import {
  accounts,
  allocationRules,
  buckets,
  expenses,
  incomeEvents,
  incomeSources,
  ledgerEntries,
  merchantRules,
  transfers,
} from '@/db/schema';

/**
 * Push/pull order matters: local SQLite enforces real foreign keys (see
 * src/db/schema.ts), so a bucket must land before any ledger entry that
 * references it. This is dependency order, not alphabetical.
 */
export const SYNCABLE_TABLES = [
  { name: 'accounts', table: accounts },
  { name: 'income_sources', table: incomeSources },
  { name: 'buckets', table: buckets },
  { name: 'allocation_rules', table: allocationRules },
  { name: 'income_events', table: incomeEvents },
  { name: 'expenses', table: expenses },
  { name: 'transfers', table: transfers },
  { name: 'ledger_entries', table: ledgerEntries },
  { name: 'merchant_rules', table: merchantRules },
] as const;

export type SyncableTableName = (typeof SYNCABLE_TABLES)[number]['name'];
