import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { allocateIncome, isCardInvoicePayment, UNALLOCATED_BUCKET_ID } from '../_shared/engine.ts';
import { normalizeMerchant } from '../_shared/merchant.ts';
import { listTransactions } from '../_shared/pluggy.ts';
import { sendExpoPush } from '../_shared/push.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

const HIGH_CONFIDENCE_HIT_COUNT = 2;

/**
 * Pluggy calls this whenever an item finishes syncing (`item/updated`) or a
 * new connection completes (`item/created`). This is where the allocation
 * engine actually runs for bank-sourced income — see the plan's
 * "Integração Pluggy" section. No auth header from Pluggy itself (it's a
 * webhook, not a user request), so this uses the service-role client and
 * trusts `itemId` to find the owning user via the `accounts` rows created
 * by `pluggy-link-item`.
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let body: { event?: string; itemId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  if (!body.itemId || (body.event !== 'item/updated' && body.event !== 'item/created')) {
    return new Response(JSON.stringify({ ignored: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = getSupabaseAdmin();

  const { data: linkedAccounts, error: accountsError } = await admin
    .from('accounts')
    .select('*')
    .eq('pluggy_item_id', body.itemId);

  if (accountsError) {
    return new Response(JSON.stringify({ error: accountsError.message }), { status: 500 });
  }
  if (!linkedAccounts || linkedAccounts.length === 0) {
    // No pluggy-link-item call happened for this itemId yet — nothing to do.
    return new Response(JSON.stringify({ ignored: true, reason: 'unlinked_item' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = linkedAccounts[0].user_id as string;
  let incomeCount = 0;
  let expenseCount = 0;
  const narrations: string[] = [];
  const overspentBuckets = new Set<string>();

  for (const account of linkedAccounts) {
    const pluggyAccountId = account.pluggy_account_id as string;
    // eslint-disable-next-line no-await-in-loop
    const transactions = await listTransactions(pluggyAccountId);

    for (const tx of transactions) {
      const txId = tx.id as string;
      const amount = tx.amount as number; // Pluggy: positive = credit, negative = debit
      const description = (tx.description as string) ?? '';
      const occurredAt = (tx.date as string) ?? new Date().toISOString();

      if (amount > 0) {
        // eslint-disable-next-line no-await-in-loop
        const already = await admin
          .from('income_events')
          .select('id')
          .eq('pluggy_transaction_id', txId)
          .maybeSingle();
        if (already.data) continue;

        const amountCents = Math.round(amount * 100);

        // eslint-disable-next-line no-await-in-loop
        const { data: sources } = await admin
          .from('income_sources')
          .select('*')
          .eq('user_id', userId);
        const matchedSource = (sources ?? []).find(
          (s) => s.match_hint && description.toLowerCase().includes(String(s.match_hint).toLowerCase()),
        );

        // eslint-disable-next-line no-await-in-loop
        const { data: rules } = matchedSource
          ? await admin
              .from('allocation_rules')
              .select('*')
              .eq('income_source_id', matchedSource.id)
              .order('created_at', { ascending: true })
          : { data: [] };

        const fixedBucketIds = (rules ?? []).filter((r) => r.mode === 'fixed').map((r) => r.bucket_id as string);

        let fundingState: Array<{ bucketId: string; fundedCents: number }> = [];
        if (fixedBucketIds.length > 0) {
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          // eslint-disable-next-line no-await-in-loop
          const { data: monthEntries } = await admin
            .from('ledger_entries')
            .select('bucket_id, amount_cents')
            .eq('user_id', userId)
            .eq('entry_type', 'allocation')
            .in('bucket_id', fixedBucketIds)
            .gte('occurred_at', monthStart.toISOString());
          const sums = new Map<string, number>();
          for (const entry of monthEntries ?? []) {
            sums.set(entry.bucket_id, (sums.get(entry.bucket_id) ?? 0) + entry.amount_cents);
          }
          fundingState = fixedBucketIds.map((bucketId) => ({ bucketId, fundedCents: sums.get(bucketId) ?? 0 }));
        }

        const allocations = allocateIncome(
          amountCents,
          (rules ?? []).map((r) => ({ bucketId: r.bucket_id, mode: r.mode, value: r.value })),
          fundingState,
        );

        const incomeEventId = crypto.randomUUID();
        const now = new Date().toISOString();
        // eslint-disable-next-line no-await-in-loop
        await admin.from('income_events').insert({
          id: incomeEventId,
          user_id: userId,
          account_id: account.id,
          income_source_id: matchedSource?.id ?? null,
          amount_cents: amountCents,
          occurred_at: occurredAt,
          source: 'pluggy',
          pluggy_transaction_id: txId,
          narrated: false,
          created_at: now,
          updated_at: now,
        });

        for (const allocation of allocations) {
          // eslint-disable-next-line no-await-in-loop
          await admin.from('ledger_entries').insert({
            id: crypto.randomUUID(),
            user_id: userId,
            bucket_id: allocation.bucketId,
            amount_cents: allocation.amountCents,
            entry_type: 'allocation',
            event_type: 'income_event',
            event_id: incomeEventId,
            occurred_at: occurredAt,
            created_at: now,
            updated_at: now,
          });
        }

        incomeCount += 1;
        const lines = allocations
          .map((a) => `${a.bucketId === UNALLOCATED_BUCKET_ID ? 'a distribuir' : a.bucketId}: R$${(a.amountCents / 100).toFixed(2)}`)
          .join(', ');
        narrations.push(`Caiu R$${(amountCents / 100).toFixed(2)} (${matchedSource?.name ?? 'renda'}) → ${lines}`);
        continue;
      }

      // Expense (amount <= 0).
      if (isCardInvoicePayment(description)) continue; // settling the card, not a new expense

      // eslint-disable-next-line no-await-in-loop
      const already = await admin.from('expenses').select('id').eq('pluggy_transaction_id', txId).maybeSingle();
      if (already.data) continue;

      const amountCents = Math.round(Math.abs(amount) * 100);
      const merchantKey = normalizeMerchant(description);

      // eslint-disable-next-line no-await-in-loop
      const { data: merchantRule } = await admin
        .from('merchant_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('merchant_normalized', merchantKey)
        .maybeSingle();

      const highConfidence = Boolean(merchantRule) && (merchantRule?.hit_count ?? 0) >= HIGH_CONFIDENCE_HIT_COUNT;
      const bucketId = merchantRule?.bucket_id ?? UNALLOCATED_BUCKET_ID;
      const reviewStatus = highConfidence ? 'auto' : 'pending';

      const expenseId = crypto.randomUUID();
      const now = new Date().toISOString();
      // eslint-disable-next-line no-await-in-loop
      await admin.from('expenses').insert({
        id: expenseId,
        user_id: userId,
        bucket_id: bucketId,
        account_id: account.id,
        amount_cents: amountCents,
        description,
        merchant_raw: description,
        occurred_at: occurredAt,
        source: 'pluggy',
        is_credit: (tx.type as string)?.toLowerCase() === 'credit_card',
        confidence: merchantRule ? Math.min(1, (merchantRule.hit_count ?? 0) / 5) : 0,
        review_status: reviewStatus,
        pluggy_transaction_id: txId,
        created_at: now,
        updated_at: now,
      });

      if (reviewStatus === 'auto') {
        // eslint-disable-next-line no-await-in-loop
        await admin.from('ledger_entries').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          bucket_id: bucketId,
          amount_cents: -amountCents,
          entry_type: 'expense',
          event_type: 'expense',
          event_id: expenseId,
          occurred_at: occurredAt,
          created_at: now,
          updated_at: now,
        });

        // eslint-disable-next-line no-await-in-loop
        const { data: balanceRows } = await admin
          .from('ledger_entries')
          .select('amount_cents')
          .eq('user_id', userId)
          .eq('bucket_id', bucketId);
        const balance = (balanceRows ?? []).reduce((acc, r) => acc + r.amount_cents, 0);
        if (balance < 0) overspentBuckets.add(bucketId);
      }
      // Pending reviews are NOT booked to the ledger yet — see app's review
      // queue (task: Fase 2 fila de revisão), which assigns the real
      // bucket and only then creates the ledger entry.

      expenseCount += 1;
    }
  }

  if (narrations.length > 0 || overspentBuckets.size > 0) {
    // eslint-disable-next-line no-await-in-loop
    const { data: tokens } = await admin.from('push_tokens').select('expo_push_token').eq('user_id', userId);
    const pushTokens = (tokens ?? []).map((t) => t.expo_push_token as string);
    if (narrations.length > 0) {
      await sendExpoPush(pushTokens, 'Grove', narrations[0]);
    }
    if (overspentBuckets.size > 0) {
      await sendExpoPush(pushTokens, 'Bolso estourado', `${overspentBuckets.size} bolso(s) ficaram negativos.`);
    }
  }

  return new Response(JSON.stringify({ incomeCount, expenseCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
