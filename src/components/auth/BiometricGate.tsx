import * as LocalAuthentication from 'expo-local-authentication';
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { isLockSuppressed } from '@/features/auth/lockSuppression';
import { colors, fontFamily, spacing } from '@/theme/tokens';

type LockState = 'checking' | 'unavailable' | 'locked' | 'unlocked';

/**
 * Financial data warrants more than the OS default, but this app has no
 * server-side account to protect beyond what's already on the device — so
 * biometrics is an additive layer on top of the OS's own disk encryption
 * and app sandboxing (see the plan's "Auth, segurança" section), not a
 * replacement for them. Devices without biometrics enrolled fall through to
 * unlocked rather than blocking someone out of their own installed app.
 */
export function BiometricGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<LockState>('checking');
  const appState = useRef(AppState.currentState);

  const attemptUnlock = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      setState('unlocked');
      return;
    }

    setState('locked');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear Grove',
      cancelLabel: 'Cancelar',
    });
    setState(result.success ? 'unlocked' : 'locked');
  }, []);

  useEffect(() => {
    attemptUnlock();
  }, [attemptUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      // Don't lock when an in-app flow (e.g. the image picker) sent us to the
      // background on purpose — otherwise picking a photo bounces to the lock.
      if (appState.current.match(/active/) && next === 'background' && !isLockSuppressed()) {
        setState((current) => (current === 'unlocked' ? 'locked' : current));
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, []);

  if (state === 'checking') return null;

  if (state === 'locked') {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Grove está trancado</Text>
        <Text style={styles.explain}>Use sua biometria pra continuar.</Text>
        <PrimaryButton label="Desbloquear" onPress={attemptUnlock} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  title: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 22 },
  explain: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 14, marginBottom: spacing.md },
});
