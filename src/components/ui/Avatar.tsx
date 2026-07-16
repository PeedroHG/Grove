import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { chipBackground, colors } from '@/theme/tokens';

interface AvatarProps {
  uri?: string | null;
  size?: number;
}

export function Avatar({ uri, size = 40 }: AvatarProps) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dim]} />;
  }
  return (
    <View style={[styles.placeholder, dim, { backgroundColor: chipBackground(colors.textPrimary, 0.12) }]}>
      <Ionicons name="person" size={size * 0.5} color={colors.textSecondary} />
    </View>
  );
}

interface AvatarPickerProps {
  uri?: string | null;
  onPress: () => void;
  size?: number;
}

/** Tappable avatar with a small camera badge — used in the onboarding profile step. */
export function AvatarPicker({ uri, onPress, size = 96 }: AvatarPickerProps) {
  return (
    <Pressable onPress={onPress} style={styles.pickerWrap}>
      <Avatar uri={uri} size={size} />
      <View style={styles.badge}>
        <Ionicons name="camera" size={15} color={colors.textOnLight} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.card },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  pickerWrap: { alignSelf: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
});
