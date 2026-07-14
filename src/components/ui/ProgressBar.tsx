import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';

interface ProgressBarProps {
  progress: number; // 0-1, clamped
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: '#18181b',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
});
