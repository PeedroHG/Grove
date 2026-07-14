import { describe, expect, it } from 'vitest';
import { isCardInvoicePayment } from './isCardInvoicePayment';

describe('isCardInvoicePayment', () => {
  it('reconhece descrições comuns de pagamento de fatura', () => {
    expect(isCardInvoicePayment('Pagamento de fatura Nubank')).toBe(true);
    expect(isCardInvoicePayment('PAGAMENTO FATURA CARTAO')).toBe(true);
    expect(isCardInvoicePayment('Fatura do cartão de crédito')).toBe(true);
    expect(isCardInvoicePayment('Invoice payment received')).toBe(true);
  });

  it('não confunde uma compra normal no cartão com o pagamento da fatura', () => {
    expect(isCardInvoicePayment('iFood *Restaurante XYZ')).toBe(false);
    expect(isCardInvoicePayment('Posto Ipiranga')).toBe(false);
    expect(isCardInvoicePayment('Transferência recebida')).toBe(false);
  });
});
