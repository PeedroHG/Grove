import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgPolicy,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';

/**
 * Postgres mirror of src/db/schema.ts (the on-device SQLite ledger). Same
 * shape, same ledger philosophy (buckets never store a balance — see the
 * local schema's doc comment) — this is the sync/backup source of truth,
 * not a second model to keep in sync by hand.
 *
 * Every table carries `userId` + RLS via `pgPolicy`, even though a BYOB
 * instance normally serves one person: it's free to add, and it means an
 * instance never has to be retrofitted if it ever serves more than one
 * account (e.g. a couple sharing one Supabase project).
 */

const ownerScoped = {
  userId: uuid('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
};

const syncColumns = {
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

function ownerPolicy(table: string) {
  return pgPolicy(`${table}_owner_only`, {
    for: 'all',
    using: sql`user_id = auth.uid()`,
    withCheck: sql`user_id = auth.uid()`,
  });
}

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    name: text('name').notNull(),
    kind: text('kind', { enum: ['pj', 'pf', 'cash'] }).notNull(),
    institution: text('institution'),
    pluggyItemId: text('pluggy_item_id'),
    pluggyAccountId: text('pluggy_account_id').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [ownerPolicy('accounts')],
).enableRLS();

export const incomeSources = pgTable(
  'income_sources',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    name: text('name').notNull(),
    accountId: text('account_id').notNull(),
    reliability: text('reliability', { enum: ['reliable', 'sporadic'] }).notNull(),
    matchHint: text('match_hint'),
    expectedMonthlyCents: integer('expected_monthly_cents'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [ownerPolicy('income_sources')],
).enableRLS();

export const buckets = pgTable(
  'buckets',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    name: text('name').notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    kind: text('kind', { enum: ['spending', 'saving'] }).notNull(),
    fundingType: text('funding_type', { enum: ['fixed', 'percentage'] }).notNull(),
    monthlyTargetCents: integer('monthly_target_cents'),
    isReserve: boolean('is_reserve').notNull().default(false),
    physicalLocation: text('physical_location', { enum: ['checking', 'caixinha'] })
      .notNull()
      .default('checking'),
    sortOrder: integer('sort_order').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [ownerPolicy('buckets')],
).enableRLS();

export const allocationRules = pgTable(
  'allocation_rules',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    incomeSourceId: text('income_source_id').notNull(),
    bucketId: text('bucket_id').notNull(),
    mode: text('mode', { enum: ['fixed', 'percentage'] }).notNull(),
    value: integer('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [ownerPolicy('allocation_rules')],
).enableRLS();

export const incomeEvents = pgTable(
  'income_events',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    accountId: text('account_id').notNull(),
    incomeSourceId: text('income_source_id'),
    amountCents: integer('amount_cents').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    source: text('source', { enum: ['pluggy', 'cash'] }).notNull(),
    pluggyTransactionId: text('pluggy_transaction_id').unique(),
    narrated: boolean('narrated').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [
    ownerPolicy('income_events'),
    index('income_events_pluggy_tx_idx').on(table.pluggyTransactionId),
  ],
).enableRLS();

export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    bucketId: text('bucket_id').notNull(),
    accountId: text('account_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    description: text('description').notNull(),
    merchantRaw: text('merchant_raw'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    source: text('source', { enum: ['pluggy', 'cash'] }).notNull(),
    isCredit: boolean('is_credit').notNull().default(false),
    confidence: real('confidence'),
    reviewStatus: text('review_status', { enum: ['auto', 'pending', 'confirmed'] })
      .notNull()
      .default('confirmed'),
    pluggyTransactionId: text('pluggy_transaction_id').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [
    ownerPolicy('expenses'),
    index('expenses_pluggy_tx_idx').on(table.pluggyTransactionId),
    index('expenses_review_status_idx').on(table.reviewStatus),
  ],
).enableRLS();

export const transfers = pgTable(
  'transfers',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    fromBucketId: text('from_bucket_id').notNull(),
    toBucketId: text('to_bucket_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    reason: text('reason', { enum: ['overspend_cover', 'savings_move', 'manual'] }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [ownerPolicy('transfers')],
).enableRLS();

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    bucketId: text('bucket_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    entryType: text('entry_type', {
      enum: ['allocation', 'expense', 'transfer_in', 'transfer_out', 'adjustment'],
    }).notNull(),
    eventType: text('event_type', { enum: ['income_event', 'expense', 'transfer'] }).notNull(),
    eventId: text('event_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [
    ownerPolicy('ledger_entries'),
    index('ledger_entries_bucket_occurred_idx').on(table.bucketId, table.occurredAt),
  ],
).enableRLS();

export const merchantRules = pgTable(
  'merchant_rules',
  {
    id: text('id').primaryKey(),
    ...ownerScoped,
    merchantNormalized: text('merchant_normalized').notNull(),
    bucketId: text('bucket_id').notNull(),
    hitCount: integer('hit_count').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
  },
  (table) => [
    ownerPolicy('merchant_rules'),
    uniqueIndex('merchant_rules_owner_merchant_key').on(table.userId, table.merchantNormalized),
  ],
).enableRLS();

/** Expo push tokens — server-only table, written by the app, read only by Edge Functions. */
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...ownerScoped,
    expoPushToken: text('expo_push_token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [ownerPolicy('push_tokens')],
).enableRLS();
