import { getSupabaseClient } from './supabaseClient';

/** Thin wrapper around `supabase.functions.invoke` — throws with a readable message on failure. */
export async function callEdgeFunction<T = unknown>(name: string, body?: Record<string, unknown>): Promise<T> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase não configurado ainda — configure em Ajustes primeiro.');
  }
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    throw new Error(`${name}: ${error.message}`);
  }
  return data as T;
}
