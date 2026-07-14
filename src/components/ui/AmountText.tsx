import { Text, type TextStyle } from 'react-native';

import { colors, fontFamily, glow } from '@/theme/tokens';
import { formatCents } from '@/lib/money';

interface AmountTextProps {
  cents: number;
  size?: 'hero' | 'balance' | 'body';
  style?: TextStyle;
}

const SIZE_STYLES = {
  hero: { fontSize: 34, fontFamily: fontFamily.bold },
  balance: { fontSize: 28, fontFamily: fontFamily.bold },
  body: { fontSize: 15, fontFamily: fontFamily.semibold },
} as const;

export function AmountText({ cents, size = 'body', style }: AmountTextProps) {
  const color = cents < 0 ? colors.negative : colors.textPrimary;
  return (
    <Text style={[SIZE_STYLES[size], glow.hero, { color }, style]}>{formatCents(cents)}</Text>
  );
}
