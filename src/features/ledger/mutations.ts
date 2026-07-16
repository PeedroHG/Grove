import { db } from '@/db/client';
import { CASH_ACCOUNT_ID } from '@/db/seed';
import { expenses, incomeEvents, ledgerEntries, transfers } from '@/db/schema';
import { newId } from '@/lib/id';
import { currentMonthRange } from '@/lib/date';
import { allocateIncome, type Allocation } from '@/shared/engine';

import { rulesForSource } from '../incomeSources/queries';
import { monthFundingState } from './queries';

export interface RecordCashIncomeInput {
  amountCents: number;
  incomeSourceId?: string;
  description?: string;
  occurredAt?: Date;
}

export interface RecordCashIncomeResult {
  incomeEventId: string;
  allocations: Allocation[];
}

/**
 * Computes (without persisting) how an income of `amountCents` would be split
 * across buckets — despesas covered first, then percentages on the rest — for
 * the given source's rules and the current month's funding state. Used both
 * for the live preview on the Adicionar screen and inside `recordCashIncome`,
 * so what the user previews is exactly what gets saved.
 */
export async function previewIncomeAllocation(
  amountCents: number,
  incomeSourceId?: string,
  reference: Date = new Date(),
): Promise<Allocation[]> {
  const rules = incomeSourceId ? await rulesForSource(incomeSourceId) : [];
  const fixedBucketIds = rules.filter((r) => r.mode === 'fixed').map((r) => r.bucketId);
  const fundingState = await monthFundingState(fixedBucketIds, currentMonthRange(reference));
  return allocateIncome(
    amountCents,
    rules.map((r) => ({ bucketId: r.bucketId, mode: r.mode, value: r.value })),
    fundingState,
  );
}

/**
 * Manual entry for cash income (dinheiro vivo) — the only recurring manual
 * flow, since bank income arrives via Pluggy in Fase 2. Runs the same
 * `allocateIncome` cascata the webhook will run later, so the narration and
 * bucket balances behave identically regardless of source.
 */
export async function recordCashIncome(input: RecordCashIncomeInput): Promise<RecordCashIncomeResult> {
  const occurredAt = input.occurredAt ?? new Date();
  const incomeEventId = newId();

  await db.insert(incomeEvents).values({
    id: incomeEventId,
    accountId: CASH_ACCOUNT_ID,
    incomeSourceId: input.incomeSourceId,
    amountCents: input.amountCents,
    occurredAt,
    source: 'cash',
  });

  const allocations = await previewIncomeAllocation(input.amountCents, input.incomeSourceId, occurredAt);

  for (const allocation of allocations) {
    await db.insert(ledgerEntries).values({
      id: newId(),
      bucketId: allocation.bucketId,
      amountCents: allocation.amountCents,
      entryType: 'allocation',
      eventType: 'income_event',
      eventId: incomeEventId,
      occurredAt,
    });
  }

  return { incomeEventId, allocations };
}

export interface RecordCashExpenseInput {
  bucketId: string;
  amountCents: number;
  description: string;
  occurredAt?: Date;
}

export async function recordCashExpense(input: RecordCashExpenseInput): Promise<string> {
  const occurredAt = input.occurredAt ?? new Date();
  const expenseId = newId();

  await db.insert(expenses).values({
    id: expenseId,
    bucketId: input.bucketId,
    accountId: CASH_ACCOUNT_ID,
    amountCents: input.amountCents,
    description: input.description,
    occurredAt,
    source: 'cash',
    isCredit: false,
    reviewStatus: 'confirmed',
  });

  await db.insert(ledgerEntries).values({
    id: newId(),
    bucketId: input.bucketId,
    amountCents: -Math.abs(input.amountCents),
    entryType: 'expense',
    eventType: 'expense',
    eventId: expenseId,
    occurredAt,
  });

  return expenseId;
}

export interface RecordTransferInput {
  fromBucketId: string;
  toBucketId: string;
  amountCents: number;
  reason: 'overspend_cover' | 'savings_move' | 'manual';
  occurredAt?: Date;
}

export async function recordTransfer(input: RecordTransferInput): Promise<string> {
  const occurredAt = input.occurredAt ?? new Date();
  const transferId = newId();

  await db.insert(transfers).values({
    id: transferId,
    fromBucketId: input.fromBucketId,
    toBucketId: input.toBucketId,
    amountCents: input.amountCents,
    reason: input.reason,
    occurredAt,
  });

  await db.insert(ledgerEntries).values([
    {
      id: newId(),
      bucketId: input.fromBucketId,
      amountCents: -Math.abs(input.amountCents),
      entryType: 'transfer_out',
      eventType: 'transfer',
      eventId: transferId,
      occurredAt,
    },
    {
      id: newId(),
      bucketId: input.toBucketId,
      amountCents: Math.abs(input.amountCents),
      entryType: 'transfer_in',
      eventType: 'transfer',
      eventId: transferId,
      occurredAt,
    },
  ]);

  return transferId;
}

/** Dia zero: distribute the balance already sitting in the bank into buckets. */
export async function recordInitialDistribution(
  allocations: Array<{ bucketId: string; amountCents: number }>,
): Promise<string> {
  const incomeEventId = newId();
  const occurredAt = new Date();

  await db.insert(incomeEvents).values({
    id: incomeEventId,
    accountId: CASH_ACCOUNT_ID,
    amountCents: allocations.reduce((acc, a) => acc + a.amountCents, 0),
    occurredAt,
    source: 'cash',
    narrated: true,
  });

  for (const allocation of allocations) {
    if (allocation.amountCents === 0) continue;
    await db.insert(ledgerEntries).values({
      id: newId(),
      bucketId: allocation.bucketId,
      amountCents: allocation.amountCents,
      entryType: 'adjustment',
      eventType: 'income_event',
      eventId: incomeEventId,
      occurredAt,
    });
  }

  return incomeEventId;
}
