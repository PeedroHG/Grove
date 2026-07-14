import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { triggerItemUpdate } from '../_shared/pluggy.ts';
import { getRequestUser } from '../_shared/supabaseAdmin.ts';

/**
 * Called when the app opens ("puxar ao abrir" from the plan) — forces
 * Pluggy to sync this item right now instead of waiting for its own
 * 8/12/24h auto-sync interval. The actual new data arrives moments later
 * via the `pluggy-webhook` function, not in this response.
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
    const { itemId } = await req.json();
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'itemId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const result = await triggerItemUpdate(itemId);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
