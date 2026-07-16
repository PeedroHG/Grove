import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, spacing } from '@/theme/tokens';

/**
 * The home is the hub now (bottom tab bar was removed), so the spoke screens
 * — Metas, Relatórios, Ajustes — need an explicit way back. navigate('/')
 * always returns to the home tab regardless of how we got here.
 */
export function BackButton({ title }: { title?: string }) {
  return (
    <View style={styles.wrap}>
      <Pressable hitSlop={10} onPress={() => router.navigate('/')} style={styles.button}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </Pressable>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  button: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  title: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17 },
});
