import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig, type SupabaseConfig } from './secureConfig';

let client: SupabaseClient | null = null;
let clientConfig: SupabaseConfig | null = null;

/**
 * Lazily built from whatever the user pasted into the setup screen. Returns
 * null when not configured yet — callers treat that as "sync is off",
 * never as an error, since the app is fully usable offline-first without it.
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = await getSupabaseConfig();
  if (!config) return null;

  if (client && clientConfig?.url === config.url && clientConfig?.anonKey === config.anonKey) {
    return client;
  }

  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  clientConfig = config;
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
  clientConfig = null;
}
