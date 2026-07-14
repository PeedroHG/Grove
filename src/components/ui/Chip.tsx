import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { chipBackground, fontFamily, radii, spacing } from '@/theme/tokens';

interface ChipProps {
  label: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Chip({ label, color, icon }: ChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: chipBackground(color) }]}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
  },
  label: { fontFamily: fontFamily.medium, fontSize: 12 },
});
