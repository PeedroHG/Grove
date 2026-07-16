import { endOfMonth, startOfMonth } from 'date-fns';

export function currentMonthRange(reference: Date = new Date()): { start: Date; end: Date } {
  return { start: startOfMonth(reference), end: endOfMonth(reference) };
}

/** 'YYYY-MM' — the key used to track a bill's paid status per month. */
export function monthKey(reference: Date = new Date()): string {
  return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
}

export function greeting(reference: Date = new Date()): string {
  const hour = reference.getHours();
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
