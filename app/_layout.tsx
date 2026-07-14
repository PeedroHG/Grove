import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  useFonts,
} from '@expo-google-fonts/onest';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/components/auth/BiometricGate';
import { DbProvider } from '@/db/DbProvider';
import { registerForPushNotifications } from '@/features/notifications/registerPush';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <DbProvider>
        <BiometricGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="nova-transacao" options={{ presentation: 'modal' }} />
            <Stack.Screen name="bolso/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="conectar-banco" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="revisao" options={{ presentation: 'modal' }} />
          </Stack>
        </BiometricGate>
      </DbProvider>
    </SafeAreaProvider>
  );
}
