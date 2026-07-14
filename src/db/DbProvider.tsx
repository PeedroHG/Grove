import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { db } from './client';
import migrations from './migrations/migrations';
import { runSeed } from './seed';

/**
 * Holds children until migrations run and the one-time seed (see seed.ts)
 * completes. A broken migration here is unrecoverable without a rebuild —
 * this is a solo device, not a fleet — so it surfaces the raw error instead
 * of pretending to degrade gracefully.
 */
export function DbProvider({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    runSeed(db)
      .then(() => setSeeded(true))
      .catch((err) => setSeedError(err instanceof Error ? err : new Error(String(err))));
  }, [success]);

  const failure = error ?? seedError;
  if (failure) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#f87171', fontWeight: '700', marginBottom: 8 }}>Erro ao preparar o banco local</Text>
        <Text style={{ color: '#a1a1aa', textAlign: 'center' }}>{failure.message}</Text>
      </View>
    );
  }

  if (!success || !seeded) return null;

  return <>{children}</>;
}
