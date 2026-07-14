import { describe, expect, it } from 'vitest';
import { allocateIncome } from './allocateIncome';
import { UNALLOCATED_BUCKET_ID } from './types';
import type { AllocationRule, FixedBucketFunding } from './types';

const sum = (allocs: { amountCents: number }[]) =>
  allocs.reduce((acc, a) => acc + a.amountCents, 0);

describe('allocateIncome', () => {
  it('renda fragmentada cobre o fixo parcialmente ao longo de várias entradas', () => {
    const rules: AllocationRule[] = [
      { bucketId: 'internet', mode: 'fixed', value: 10_000 },
      { bucketId: 'guardar', mode: 'percentage', value: 100 },
    ];

    // Primeira entrada do mês: R$40 — não cobre nem metade do fixo de R$100.
    const first = allocateIncome(4_000, rules, []);
    expect(first).toEqual([{ bucketId: 'internet', amountCents: 4_000 }]);
    expect(sum(first)).toBe(4_000);

    // Segunda entrada: R$40 — soma R$80 de R$100, ainda não fechou.
    const funding: FixedBucketFunding[] = [{ bucketId: 'internet', fundedCents: 4_000 }];
    const second = allocateIncome(4_000, rules, funding);
    expect(second).toEqual([{ bucketId: 'internet', amountCents: 4_000 }]);

    // Terceira entrada: R$50 — os R$20 que faltam vão pro fixo, o resto (R$30) pra %.
    const funding2: FixedBucketFunding[] = [{ bucketId: 'internet', fundedCents: 8_000 }];
    const third = allocateIncome(5_000, rules, funding2);
    expect(third).toEqual(
      expect.arrayContaining([
        { bucketId: 'internet', amountCents: 2_000 },
        { bucketId: 'guardar', amountCents: 3_000 },
      ]),
    );
    expect(sum(third)).toBe(5_000);
  });

  it('entrada que não cobre nem o fixo vai inteira pro fixo, nada sobra pras %', () => {
    const rules: AllocationRule[] = [
      { bucketId: 'internet', mode: 'fixed', value: 10_000 },
      { bucketId: 'guardar', mode: 'percentage', value: 50 },
    ];

    const result = allocateIncome(3_000, rules, []);
    expect(result).toEqual([{ bucketId: 'internet', amountCents: 3_000 }]);
    expect(sum(result)).toBe(3_000);
  });

  it('entrada chega com os fixos do mês já cheios: tudo vai pras porcentagens', () => {
    const rules: AllocationRule[] = [
      { bucketId: 'internet', mode: 'fixed', value: 10_000 },
      { bucketId: 'guardar', mode: 'percentage', value: 60 },
      { bucketId: 'namorada', mode: 'percentage', value: 40 },
    ];
    const funding: FixedBucketFunding[] = [{ bucketId: 'internet', fundedCents: 10_000 }];

    const result = allocateIncome(10_000, rules, funding);
    expect(result).toEqual(
      expect.arrayContaining([
        { bucketId: 'guardar', amountCents: 6_000 },
        { bucketId: 'namorada', amountCents: 4_000 },
      ]),
    );
    expect(result.find((a) => a.bucketId === 'internet')).toBeUndefined();
    expect(sum(result)).toBe(10_000);
  });

  it('percentuais que não somam 100 mandam o resto pro bolso "a distribuir"', () => {
    const rules: AllocationRule[] = [{ bucketId: 'guardar', mode: 'percentage', value: 20 }];

    const result = allocateIncome(10_000, rules, []);
    expect(result).toEqual(
      expect.arrayContaining([
        { bucketId: 'guardar', amountCents: 2_000 },
        { bucketId: UNALLOCATED_BUCKET_ID, amountCents: 8_000 },
      ]),
    );
    expect(sum(result)).toBe(10_000);
  });

  it('arredondamento de porcentagem nunca perde nem inventa centavo — sobra vai pra "a distribuir"', () => {
    // R$100 dividido em 3 partes iguais de 33% cada: 33+33+33 = 99%, sobra 1 centavo + 1% no ar.
    const rules: AllocationRule[] = [
      { bucketId: 'a', mode: 'percentage', value: 33 },
      { bucketId: 'b', mode: 'percentage', value: 33 },
      { bucketId: 'c', mode: 'percentage', value: 33 },
    ];

    const result = allocateIncome(10_001, rules, []);
    expect(sum(result)).toBe(10_001);
    expect(result.find((a) => a.bucketId === 'a')?.amountCents).toBe(3_300);
    expect(result.find((a) => a.bucketId === UNALLOCATED_BUCKET_ID)?.amountCents).toBe(101);
  });

  it('fonte esporádica sem regra de fixo manda tudo pras metas/porcentagens', () => {
    // Fonte confiável (estágio) tem fixo; fonte esporádica (freela) só tem %.
    const freelaRules: AllocationRule[] = [
      { bucketId: 'guardar', mode: 'percentage', value: 30 },
      { bucketId: 'namorada', mode: 'percentage', value: 70 },
    ];

    const result = allocateIncome(35_000, freelaRules, [
      // fundingState de um bolso fixo que só existe pra OUTRA fonte é irrelevante aqui
      { bucketId: 'internet', fundedCents: 0 },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        { bucketId: 'guardar', amountCents: 10_500 },
        { bucketId: 'namorada', amountCents: 24_500 },
      ]),
    );
    expect(result.find((a) => a.bucketId === 'internet')).toBeUndefined();
    expect(sum(result)).toBe(35_000);
  });

  it('sem nenhuma regra, tudo cai em "a distribuir"', () => {
    const result = allocateIncome(1_500, [], []);
    expect(result).toEqual([{ bucketId: UNALLOCATED_BUCKET_ID, amountCents: 1_500 }]);
  });

  it('valor zero não gera nenhuma alocação', () => {
    const rules: AllocationRule[] = [{ bucketId: 'guardar', mode: 'percentage', value: 100 }];
    expect(allocateIncome(0, rules, [])).toEqual([]);
  });

  it('rejeita valores não inteiros ou negativos', () => {
    expect(() => allocateIncome(-100, [], [])).toThrow();
    expect(() => allocateIncome(10.5, [], [])).toThrow();
  });

  it('múltiplos fixos são cobertos na ordem das regras antes de qualquer porcentagem', () => {
    const rules: AllocationRule[] = [
      { bucketId: 'internet', mode: 'fixed', value: 5_000 },
      { bucketId: 'gasolina', mode: 'fixed', value: 8_000 },
      { bucketId: 'guardar', mode: 'percentage', value: 100 },
    ];

    // R$100 só dá pra cobrir a internet inteira (R$50) e parte da gasolina (R$50 de R$80).
    const result = allocateIncome(10_000, rules, []);
    expect(result).toEqual(
      expect.arrayContaining([
        { bucketId: 'internet', amountCents: 5_000 },
        { bucketId: 'gasolina', amountCents: 5_000 },
      ]),
    );
    expect(result.find((a) => a.bucketId === 'guardar')).toBeUndefined();
    expect(sum(result)).toBe(10_000);
  });
});
