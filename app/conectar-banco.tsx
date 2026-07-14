import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { callEdgeFunction } from '@/lib/edgeFunctions';
import { colors, fontFamily, spacing } from '@/theme/tokens';

interface ConnectTokenResponse {
  accessToken: string;
}

/**
 * Uses Pluggy's hosted JS widget (`pluggy-connect.js` from their CDN) inside
 * a WebView instead of the native `react-native-pluggy-connect` SDK. Same
 * result (a Connect Widget flow ending in an `itemId`), but this way Fase 2
 * doesn't need an EAS dev build — `react-native-webview` works fine inside
 * Expo Go, unlike a native SDK. Verify the CDN version tag against
 * https://docs.pluggy.ai when actually wiring this up against the sandbox.
 */
export default function ConectarBancoScreen() {
  const { kind, itemId } = useLocalSearchParams<{ kind: 'pj' | 'pf'; itemId?: string }>();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    callEdgeFunction<ConnectTokenResponse>('pluggy-connect-token', itemId ? { itemId } : undefined)
      .then((res) => setAccessToken(res.accessToken))
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : String(err)));
  }, [itemId]);

  const html = useMemo(() => {
    if (!accessToken) return null;
    return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;background:#000;">
<script src="https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js"></script>
<script>
  window.onload = function () {
    try {
      var connect = new PluggyConnect({
        connectToken: ${JSON.stringify(accessToken)},
        includeSandbox: true,
        onSuccess: function (itemData) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', item: itemData.item }));
        },
        onError: function (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: error }));
        },
        onClose: function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close' }));
        }
      });
      connect.init();
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: String(e) }));
    }
  };
</script>
</body>
</html>`;
  }, [accessToken]);

  const handleMessage = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'success') {
        setStatusMessage('Conectado! Vinculando conta...');
        await callEdgeFunction('pluggy-link-item', { itemId: parsed.item.id, kind: kind ?? 'pf' });
        setStatusMessage('Conta vinculada com sucesso.');
        setTimeout(() => router.back(), 1200);
      } else if (parsed.type === 'error') {
        setErrorMessage(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error));
      } else if (parsed.type === 'close') {
        router.back();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.error}>{errorMessage}</Text>
        <PrimaryButton label="Voltar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (!html) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.status}>Preparando conexão...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        onMessage={(event) => handleMessage(event.nativeEvent.data)}
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  webview: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  status: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 14, textAlign: 'center', padding: spacing.sm },
  error: { color: colors.negative, fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center' },
});
