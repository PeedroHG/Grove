const INVOICE_PAYMENT_PATTERNS = [
  /pagamento.*fatura/i,
  /fatura.*cart[aã]o/i,
  /invoice payment/i,
  /credit card payment/i,
];

/**
 * A card purchase debits its bucket the moment it happens (see
 * `allocateIncome` doc), so when the checking account later shows the
 * invoice being paid, that transaction must NOT be booked as a second
 * expense — it's just money moving to settle what's already accounted for.
 *
 * Heuristic on the transaction description; refine with real Nubank/Pluggy
 * samples once Fase 2 ingestion is wired up.
 */
export function isCardInvoicePayment(description: string): boolean {
  return INVOICE_PAYMENT_PATTERNS.some((pattern) => pattern.test(description));
}
