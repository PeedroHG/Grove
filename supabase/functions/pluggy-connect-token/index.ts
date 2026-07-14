import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createConnectToken } from '../_shared/pluggy.ts';
import { getRequestUser } from '../_shared/supabaseAdmin.ts';

/**
 * Called by the app right before opening the Pluggy Connect Widget. Body:
 * `{ itemId? }` — pass an existing itemId to reopen the widget in "update
 * mode" (reconnecting after the ~12 month Open Finance consent expires).
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
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const result = await createConnectToken({ itemId: body.itemId, clientUserId: user.id });
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
