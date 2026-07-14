/** Suggested colors cycled through when the onboarding-coach creates buckets. */
export const BUCKET_COLOR_PALETTE = [
  '#a78bfa', // roxo
  '#fb923c', // laranja
  '#fb7185', // rosa/vermelho
  '#60a5fa', // azul
  '#4ade80', // verde
  '#facc15', // amarelo
  '#2dd4bf', // teal
  '#f472b6', // pink
] as const;

export function colorForIndex(index: number): string {
  return BUCKET_COLOR_PALETTE[index % BUCKET_COLOR_PALETTE.length];
}

/** Keyword → Ionicons glyph, used to suggest an icon while typing a bucket name. */
const ICON_HINTS: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['internet', 'wifi'], icon: 'wifi' },
  { keywords: ['gasolina', 'moto', 'combustível', 'combustivel'], icon: 'bicycle' },
  { keywords: ['mercado', 'supermercado'], icon: 'cart' },
  { keywords: ['namorad', 'presente', 'lanche'], icon: 'heart' },
  { keywords: ['emergência', 'emergencia'], icon: 'medkit' },
  { keywords: ['guardar', 'reserva'], icon: 'lock-closed' },
  { keywords: ['investir', 'investimento'], icon: 'trending-up' },
  { keywords: ['viagem'], icon: 'airplane' },
  { keywords: ['aluguel', 'moradia', 'casa'], icon: 'home' },
  { keywords: ['transporte', 'uber', 'ônibus', 'onibus'], icon: 'car' },
];

export function suggestIcon(bucketName: string): string {
  const normalized = bucketName.trim().toLowerCase();
  const match = ICON_HINTS.find((hint) => hint.keywords.some((k) => normalized.includes(k)));
  return match?.icon ?? 'pricetag';
}
