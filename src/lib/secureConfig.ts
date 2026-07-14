import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL_KEY = 'grove.supabase.url';
const SUPABASE_ANON_KEY_KEY = 'grove.supabase.anonKey';

/**
 * BYOB: there is no baked-in backend. Each install points at whichever
 * Supabase project its owner created, entered once in the setup screen and
 * kept in the OS keychain/keystore — never in the app bundle, never in a
 * committed .env.
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export async function getSupabaseConfig(): Promise<SupabaseConfig | null> {
  const [url, anonKey] = await Promise.all([
    SecureStore.getItemAsync(SUPABASE_URL_KEY),
    SecureStore.getItemAsync(SUPABASE_ANON_KEY_KEY),
  ]);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function setSupabaseConfig(config: SupabaseConfig): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SUPABASE_URL_KEY, config.url),
    SecureStore.setItemAsync(SUPABASE_ANON_KEY_KEY, config.anonKey),
  ]);
}

export async function clearSupabaseConfig(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SUPABASE_URL_KEY),
    SecureStore.deleteItemAsync(SUPABASE_ANON_KEY_KEY),
  ]);
}
