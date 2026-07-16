import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { chipBackground, fontFamily, radii, spacing } from '@/theme/tokens';

interface ChipProps {
  label: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 'sm' (default) for compact lists; 'md' for tappable selectors. */
  size?: 'sm' | 'md';
}

export function Chip({ label, color, icon, size = 'sm' }: ChipProps) {
  const s = size === 'md' ? styles.md : styles.sm;
  return (
    <View style={[styles.chip, s, { backgroundColor: chipBackground(color) }]}>
      {icon ? <Ionicons name={icon} size={size === 'md' ? 17 : 13} color={color} /> : null}
      <Text style={[styles.label, size === 'md' && styles.labelMd, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
  },
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm + 2 },
  md: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md + 2, gap: 7 },
  label: { fontFamily: fontFamily.medium, fontSize: 12 },
  labelMd: { fontSize: 15 },
});
