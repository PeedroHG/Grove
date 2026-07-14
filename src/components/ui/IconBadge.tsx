import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { chipBackground, colors } from '@/theme/tokens';

interface IconBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

/** A large icon in a soft translucent circle — used for hero/step illustrations. */
export function IconBadge({ icon, size = 72, color = colors.textPrimary }: IconBadgeProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: chipBackground(color, 0.12) },
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
