/**
 * Thin wrapper around the Pluggy API. `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET`
 * come from your own "Meu Pluggy" Development Application — set as function
 * secrets (`supabase secrets set`), never shipped in the app. Endpoints
 * below follow Pluggy's public docs as of when this was written; if
 * anything 404s during sandbox testing, check https://docs.pluggy.ai first —
 * this is exactly the kind of integration detail that drifts.
 */

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

let cachedApiKey: { key: string; expiresAt: number } | null = null;

async function getPluggyApiKey(): Promise<string> {
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now()) {
    return cachedApiKey.key;
  }

  const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
  const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET not set in the function environment');
  }

  const res = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    throw new Error(`Pluggy /auth failed: ${res.status} ${await res.text()}`);
  }
  const { apiKey } = await res.json();
  // Pluggy API keys are short-lived; refresh a couple minutes early.
  cachedApiKey = { key: apiKey, expiresAt: Date.now() + 1000 * 60 * 25 };
  return apiKey;
}

async function pluggyFetch(path: string, init: RequestInit = {}) {
  const apiKey = await getPluggyApiKey();
  const res = await fetch(`${PLUGGY_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Pluggy ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Creates a Connect token for the Pluggy Connect Widget to open with. */
export async function createConnectToken(options?: { itemId?: string; clientUserId?: string }) {
  return pluggyFetch('/connect_token', {
    method: 'POST',
    body: JSON.stringify({
      itemId: options?.itemId,
      clientUserId: options?.clientUserId,
    }),
  });
}

/** Forces a fresh sync of an already-connected item (used by pluggy-refresh). */
export async function triggerItemUpdate(itemId: string) {
  return pluggyFetch(`/items/${itemId}`, { method: 'PATCH' });
}

export async function getItem(itemId: string) {
  return pluggyFetch(`/items/${itemId}`);
}

export async function listAccounts(itemId: string) {
  const result = await pluggyFetch(`/accounts?itemId=${itemId}`);
  return result.results as Array<Record<string, unknown>>;
}

export async function listTransactions(accountId: string, from?: string) {
  const query = new URLSearchParams({ accountId, pageSize: '500' });
  if (from) query.set('from', from);
  const result = await pluggyFetch(`/transactions?${query.toString()}`);
  return result.results as Array<Record<string, unknown>>;
}
