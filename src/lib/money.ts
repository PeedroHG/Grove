const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * The only place user-typed decimal strings become cents. Never
 * `parseFloat` straight into storage anywhere else in the app.
 */
export function toCents(input: string): number {
  const normalized = input.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`Valor inválido: "${input}"`);
  }
  return Math.round(value * 100);
}

export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}
