import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Ledger model: buckets never store a balance column. Every credit/debit is
 * a row in `ledgerEntries`, and a bucket's balance is always the SUM of its
 * entries. This is what makes recategorizing a reviewed expense, reprocessing
 * a changed rule, or narrating "where did this money come from" free of
 * drift — see the plan's "Modelo de dados (ledger / livro-razão)" section.
 *
 * `updatedAt` + `deletedAt` exist on every syncable table from day one even
 * though Fase 0 has no backend yet, so the Fase 1 sync layer (last-write-wins
 * by updatedAt + tombstone) doesn't require a schema migration to retrofit.
 */

const syncColumns = {
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
};

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['pj', 'pf', 'cash'] }).notNull(),
  institution: text('institution'),
  pluggyItemId: text('pluggy_item_id'),
  pluggyAccountId: text('pluggy_account_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

export const incomeSources = sqliteTable('income_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  reliability: text('reliability', { enum: ['reliable', 'sporadic'] }).notNull(),
  /** Nome/CPF do pagador do Pix, usado pra reconhecer a fonte automaticamente. */
  matchHint: text('match_hint'),
  /** Quanto essa fonte costuma render por mês (centavos). Alimenta o resumo/estimativa; não afeta a alocação, que é por depósito real. */
  expectedMonthlyCents: integer('expected_monthly_cents'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

export const buckets = sqliteTable('buckets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  kind: text('kind', { enum: ['spending', 'saving'] }).notNull(),
  fundingType: text('funding_type', { enum: ['fixed', 'percentage'] }).notNull(),
  /** Meta mensal em centavos — só relevante quando fundingType = 'fixed'. */
  monthlyTargetCents: integer('monthly_target_cents'),
  isReserve: integer('is_reserve', { mode: 'boolean' }).notNull().default(false),
  physicalLocation: text('physical_location', { enum: ['checking', 'caixinha'] })
    .notNull()
    .default('checking'),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

export const allocationRules = sqliteTable('allocation_rules', {
  id: text('id').primaryKey(),
  incomeSourceId: text('income_source_id')
    .notNull()
    .references(() => incomeSources.id),
  bucketId: text('bucket_id')
    .notNull()
    .references(() => buckets.id),
  mode: text('mode', { enum: ['fixed', 'percentage'] }).notNull(),
  /** Fixed: meta mensal em centavos. Percentage: pontos percentuais (0-100). */
  value: integer('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

export const incomeEvents = sqliteTable('income_events', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  incomeSourceId: text('income_source_id').references(() => incomeSources.id),
  amountCents: integer('amount_cents').notNull(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  source: text('source', { enum: ['pluggy', 'cash'] }).notNull(),
  pluggyTransactionId: text('pluggy_transaction_id').unique(),
  narrated: integer('narrated', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  bucketId: text('bucket_id')
    .notNull()
    .references(() => buckets.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  amountCents: integer('amount_cents').notNull(),
  description: text('description').notNull(),
  merchantRaw: text('merchant_raw'),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  source: text('source', { enum: ['pluggy', 'cash'] }).notNull(),
  isCredit: integer('is_credit', { mode: 'boolean' }).notNull().default(false),
  confidence: integer('confidence'),
  reviewStatus: text('review_status', { enum: ['auto', 'pending', 'confirmed'] })
    .notNull()
    .default('confirmed'),
  pluggyTransactionId: text('pluggy_transaction_id').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

export const transfers = sqliteTable('transfers', {
  id: text('id').primaryKey(),
  fromBucketId: text('from_bucket_id')
    .notNull()
    .references(() => buckets.id),
  toBucketId: text('to_bucket_id')
    .notNull()
    .references(() => buckets.id),
  amountCents: integer('amount_cents').notNull(),
  reason: text('reason', { enum: ['overspend_cover', 'savings_move', 'manual'] }).notNull(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});

/**
 * The source of truth. A bucket's balance is always
 * `SUM(amountCents) WHERE bucketId = X` — never a stored column.
 */
export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: text('id').primaryKey(),
    bucketId: text('bucket_id')
      .notNull()
      .references(() => buckets.id),
    /** Signed: positive = credit, negative = debit. */
    amountCents: integer('amount_cents').notNull(),
    entryType: text('entry_type', {
      enum: ['allocation', 'expense', 'transfer_in', 'transfer_out', 'adjustment'],
    }).notNull(),
    /** Which table the originating event lives in (income_events/expenses/transfers). */
    eventType: text('event_type', {
      enum: ['income_event', 'expense', 'transfer'],
    }).notNull(),
    eventId: text('event_id').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    ...syncColumns,
  },
  (table) => [index('ledger_entries_bucket_occurred_idx').on(table.bucketId, table.occurredAt)],
);

export const merchantRules = sqliteTable('merchant_rules', {
  id: text('id').primaryKey(),
  merchantNormalized: text('merchant_normalized').notNull().unique(),
  bucketId: text('bucket_id')
    .notNull()
    .references(() => buckets.id),
  hitCount: integer('hit_count').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ...syncColumns,
});
