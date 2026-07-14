import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { getSupabaseConfig, setSupabaseConfig } from '@/lib/secureConfig';
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabaseClient';
import { getLastSyncLabel, runSync } from '@/sync/engine';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

type Stage = 'loading' | 'unconfigured' | 'awaiting-otp' | 'connected';

export function SyncSection() {
  const [stage, setStage] = useState<Stage>('loading');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStage = async () => {
    const config = await getSupabaseConfig();
    if (!config) {
      setStage('unconfigured');
      return;
    }
    const client = await getSupabaseClient();
    const { data } = (await client?.auth.getUser()) ?? { data: { user: null } };
    setStage(data.user ? 'connected' : 'awaiting-otp');
    setLastSync(await getLastSyncLabel());
  };

  useEffect(() => {
    refreshStage();
  }, []);

  const handleSaveConfig = async () => {
    if (!url.trim() || !anonKey.trim()) return;
    setBusy(true);
    try {
      await setSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
      resetSupabaseClient();
      setStatus('Configuração salva. Agora entre com seu email.');
      await refreshStage();
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const client = await getSupabaseClient();
      const { error } = (await client?.auth.signInWithOtp({ email: email.trim() })) ?? {};
      setStatus(error ? `Erro: ${error.message}` : 'Código enviado — confira seu email.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email.trim() || !otp.trim()) return;
    setBusy(true);
    try {
      const client = await getSupabaseClient();
      const { error } = (await client?.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      })) ?? {};
      if (error) {
        setStatus(`Erro: ${error.message}`);
      } else {
        setStatus('Conectado!');
        await refreshStage();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      const result = await runSync();
      if (result.skipped) {
        setStatus('Sincronização não configurada ou não autenticada ainda.');
      } else if (result.error) {
        setStatus(`Erro na sincronização: ${result.error}`);
      } else {
        setStatus(`Sincronizado: ${result.pushed} enviados, ${result.pulled} recebidos.`);
      }
      setLastSync(await getLastSyncLabel());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Conta e sincronização</Text>
      <Text style={styles.explain}>
        O Grove funciona 100% offline sem isso. Conecte seu próprio projeto Supabase (grátis) só
        se quiser backup na nuvem e sincronizar entre aparelhos — veja o README pra criar o seu.
      </Text>

      {stage === 'unconfigured' || stage === 'loading' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Supabase URL"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            value={url}
            onChangeText={setUrl}
          />
          <TextInput
            style={styles.input}
            placeholder="Supabase anon key"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            secureTextEntry
            value={anonKey}
            onChangeText={setAnonKey}
          />
          <PrimaryButton label="Salvar configuração" onPress={handleSaveConfig} disabled={busy} />
        </>
      ) : null}

      {stage === 'awaiting-otp' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Seu email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton label="Enviar código" onPress={handleSendOtp} disabled={busy} />
          <TextInput
            style={styles.input}
            placeholder="Código recebido por email"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />
          <PrimaryButton label="Confirmar" onPress={handleVerifyOtp} disabled={busy} />
        </>
      ) : null}

      {stage === 'connected' ? (
        <>
          <Text style={styles.connected}>Conectado ao seu Supabase.</Text>
          <Text style={styles.explain}>
            Última sincronização: {lastSync ? new Date(lastSync).toLocaleString('pt-BR') : 'nunca'}
          </Text>
          <PrimaryButton label={busy ? 'Sincronizando...' : 'Sincronizar agora'} onPress={handleSyncNow} disabled={busy} />
        </>
      ) : null}

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 15 },
  explain: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  connected: { color: colors.positive, fontFamily: fontFamily.medium, fontSize: 13 },
  status: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 12 },
});
