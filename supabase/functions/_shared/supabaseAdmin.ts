import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Service-role client — bypasses RLS, used only inside Edge Functions to
 * write ledger rows for the authenticated Pluggy item's owner. SUPABASE_URL
 * and SUPABASE_SERVICE_ROLE_KEY are auto-provisioned by the Supabase
 * platform for every Edge Function; you don't set these yourself.
 */
export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in the function environment');
  }
  return createClient(url, serviceRoleKey);
}

/** Resolves the calling user from the request's own JWT (respects who's logged in). */
export async function getRequestUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
