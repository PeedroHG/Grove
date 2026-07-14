import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { listAccounts } from '../_shared/pluggy.ts';
import { getRequestUser, getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

/**
 * Called by the app right after the Pluggy Connect Widget succeeds and
 * hands back an `itemId`. This is what makes `pluggy-webhook` able to find
 * "whose data is this" later — the webhook payload carries only the
 * Pluggy itemId, never a Supabase user id, so that mapping has to exist
 * before the first webhook fires.
 *
 * Body: `{ itemId, kind: 'pj' | 'pf' }` — one call per connected Nubank
 * account (PJ and PF are connected separately, each with its own itemId).
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const user = await getRequestUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { itemId, kind } = await req.json();
    if (!itemId || !kind) {
      return new Response(JSON.stringify({ error: 'itemId and kind are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pluggyAccounts = await listAccounts(itemId);
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();

    const rows = pluggyAccounts.map((acc) => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      name: (acc.name as string) ?? 'Nubank',
      kind,
      institution: 'Nubank',
      pluggy_item_id: itemId,
      pluggy_account_id: acc.id as string,
      created_at: now,
      updated_at: now,
    }));

    const { error } = await admin.from('accounts').upsert(rows, { onConflict: 'pluggy_account_id' });
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ linked: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
