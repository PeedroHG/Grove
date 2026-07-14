/**
 * Plain TS tokens, no theme provider — there's no light mode, so components
 * import straight from here into StyleSheet.create. See the plan's
 * "Identidade visual" section: all-black, mono (no signature accent color;
 * the only color comes from each bucket's own hex), subtle glow.
 */
export const colors = {
  bg: '#000000',
  card: '#09090b',
  border: '#27272a',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textOnLight: '#09090b',
  positive: '#4ade80',
  negative: '#f87171',
} as const;

/** Converts a bucket's solid hex color into its translucent chip background. */
export function chipBackground(hex: string, alpha = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const fontFamily = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
} as const;

export const typography = {
  hero: { fontSize: 34, fontFamily: fontFamily.bold },
  balance: { fontSize: 28, fontFamily: fontFamily.bold },
  title: { fontSize: 17, fontFamily: fontFamily.semibold },
  body: { fontSize: 15, fontFamily: fontFamily.regular },
  label: { fontSize: 11, fontFamily: fontFamily.medium, letterSpacing: 0.6 },
  caption: { fontSize: 13, fontFamily: fontFamily.regular },
} as const;

/** "Sente, não salta" — a discreet white text-shadow, not a colored one. */
export const glow = {
  hero: {
    textShadowColor: 'rgba(250, 250, 250, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  active: {
    shadowColor: '#fafafa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
} as const;

export const hairline = {
  borderWidth: 1,
  borderColor: colors.border,
} as const;
