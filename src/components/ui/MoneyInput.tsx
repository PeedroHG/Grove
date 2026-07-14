import { StyleSheet, TextInput, type TextStyle } from 'react-native';

import { formatCents } from '@/lib/money';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

interface MoneyInputProps {
  valueCents: number | null;
  onChangeCents: (cents: number | null) => void;
  placeholder?: string;
  style?: TextStyle | TextStyle[];
  autoFocus?: boolean;
}

/**
 * Currency field that formats as you type (maquininha style): every digit
 * shifts the value one decimal place, so the user never fights a cursor or a
 * separator. It owns the cents<->display conversion so callers deal only in
 * integer cents — never a raw string that needs parsing later.
 */
export function MoneyInput({ valueCents, onChangeCents, placeholder, style, autoFocus }: MoneyInputProps) {
  const display = valueCents != null ? formatCents(valueCents) : '';

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    onChangeCents(digits ? Number.parseInt(digits, 10) : null);
  };

  return (
    <TextInput
      style={[styles.input, style]}
      value={display}
      onChangeText={handleChange}
      placeholder={placeholder ?? 'R$ 0,00'}
      placeholderTextColor={colors.textMuted}
      keyboardType="number-pad"
      inputMode="numeric"
      autoFocus={autoFocus}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 16,
  },
});
