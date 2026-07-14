import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getSupabaseClient } from '@/lib/supabaseClient';

/**
 * No-ops silently when Supabase isn't configured or the OS denies
 * permission — push is a nice-to-have on top of an app that's fully usable
 * without it, never a blocking requirement.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    // Expo Go removed Push Notifications on Android since SDK 53.
    // We skip it entirely to avoid a hard crash.
    if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
      console.log('Skipping push notifications in Expo Go Android');
      return;
    }

    const Notifications = require('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('push_tokens').upsert(
      { user_id: user.id, expo_push_token: token },
      { onConflict: 'expo_push_token' },
    );
  } catch (err) {
    // Best-effort — push not working never blocks app usage.
    console.log('Error registering push:', err);
  }
}
