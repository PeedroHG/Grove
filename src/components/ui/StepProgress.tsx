import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/theme/tokens';

interface StepProgressProps {
  total: number;
  current: number; // 0-indexed
}

export function StepProgress({ total, current }: StepProgressProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Segment key={i} active={i <= current} />
      ))}
    </View>
  );
}

function Segment({ active }: { active: boolean }) {
  // The fill grows from 0→100% width when the segment activates, and
  // shrinks back when you step back — a smooth sweep instead of a hard flip.
  const progress = useDerivedValue(() => withTiming(active ? 1 : 0, { duration: 320 }), [active]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, flex: 1 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
});
