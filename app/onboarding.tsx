import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedLucideIcon, LUCIDE_ICONS } from '@/components/ui/AnimatedLucideIcon';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepProgress } from '@/components/ui/StepProgress';
import { createBucket } from '@/features/buckets/mutations';
import { colorForIndex, suggestIcon } from '@/features/buckets/palette';
import { createIncomeSource } from '@/features/incomeSources/mutations';
import { recordInitialDistribution } from '@/features/ledger/mutations';
import { formatCents } from '@/lib/money';
import { allocateIncome, UNALLOCATED_BUCKET_ID, type AllocationRule } from '@/shared/engine';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

interface IncomeItem {
  name: string;
  amountCents: number | null;
}
interface FixedItem {
  name: string;
  valueCents: number | null;
}
interface SavingItem {
  name: string;
  targetCents: number | null;
  isReserve: boolean;
}

const STEP_COUNT = 6;

const STEP_ICON: Record<number, keyof typeof LUCIDE_ICONS> = {
  0: 'sparkles',
  1: 'receipt',
  2: 'target',
  3: 'chart-pie',
  4: 'wallet',
  5: 'circle-check',
};

interface PreviewRow {
  label: string;
  color: string;
  amountCents: number;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const [incomes, setIncomes] = useState<IncomeItem[]>([{ name: 'Renda principal', amountCents: null }]);
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([{ name: '', valueCents: null }]);
  const [savingItems, setSavingItems] = useState<SavingItem[]>([{ name: '', targetCents: null, isReserve: false }]);
  const [freeSpendName, setFreeSpendName] = useState('Gastos livres');
  const [wantsPct, setWantsPct] = useState('60');
  const [currentBalanceCents, setCurrentBalanceCents] = useState<number | null>(null);

  const futurePct = Math.max(0, 100 - (Number.parseInt(wantsPct, 10) || 0));

  const updateIncome = (index: number, patch: Partial<IncomeItem>) => {
    setIncomes((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const updateFixed = (index: number, patch: Partial<FixedItem>) => {
    setFixedItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const updateSaving = (index: number, patch: Partial<SavingItem>) => {
    setSavingItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  // Live preview of how a typical month's income would split — same engine
  // that runs on real deposits, so what the user sees here is what they'll get.
  const preview = useMemo<{ totalCents: number; rows: PreviewRow[] }>(() => {
    const totalCents = incomes.reduce((acc, i) => acc + (i.amountCents ?? 0), 0);
    const validFixed = fixedItems.filter((f) => f.name.trim() && f.valueCents != null);
    const validSaving = savingItems.filter((s) => s.name.trim());

    const meta = new Map<string, { label: string; color: string }>();
    const rules: AllocationRule[] = [];

    validFixed.forEach((item, i) => {
      const id = `f${i}`;
      meta.set(id, { label: item.name.trim(), color: colorForIndex(i) });
      rules.push({ bucketId: id, mode: 'fixed', value: item.valueCents ?? 0 });
    });

    const wants = Number.parseInt(wantsPct, 10) || 0;
    meta.set('free', { label: freeSpendName.trim() || 'Gastos livres', color: colorForIndex(2) });
    rules.push({ bucketId: 'free', mode: 'percentage', value: wants });

    if (validSaving.length > 0) {
      const perGoal = Math.floor(futurePct / validSaving.length);
      validSaving.forEach((item, i) => {
        const id = `s${i}`;
        meta.set(id, { label: item.name.trim(), color: colorForIndex(i + 4) });
        rules.push({ bucketId: id, mode: 'percentage', value: perGoal });
      });
    }

    if (totalCents === 0) return { totalCents: 0, rows: [] };

    const allocations = allocateIncome(totalCents, rules, []);
    const rows = allocations
      .map((a) => ({
        label: a.bucketId === UNALLOCATED_BUCKET_ID ? 'A distribuir' : meta.get(a.bucketId)?.label ?? a.bucketId,
        color: a.bucketId === UNALLOCATED_BUCKET_ID ? colors.textMuted : meta.get(a.bucketId)?.color ?? colors.textMuted,
        amountCents: a.amountCents,
      }))
      .sort((x, y) => y.amountCents - x.amountCents);

    return { totalCents, rows };
  }, [incomes, fixedItems, savingItems, freeSpendName, wantsPct, futurePct]);

  const finish = async () => {
    setSaving(true);
    try {
      const validIncomes = incomes.filter((i) => i.name.trim());
      const validFixed = fixedItems.filter((f) => f.name.trim() && f.valueCents != null);
      const validSaving = savingItems.filter((s) => s.name.trim());

      const fixedBucketIds: string[] = [];
      for (const item of validFixed) {
        const id = await createBucket({
          name: item.name.trim(),
          color: colorForIndex(fixedBucketIds.length),
          icon: suggestIcon(item.name),
          kind: 'spending',
          fundingType: 'fixed',
          monthlyTargetCents: item.valueCents ?? 0,
        });
        fixedBucketIds.push(id);
      }

      const savingBucketIds: string[] = [];
      for (const item of validSaving) {
        const id = await createBucket({
          name: item.name.trim(),
          color: colorForIndex(savingBucketIds.length + 4),
          icon: suggestIcon(item.name),
          kind: 'saving',
          fundingType: 'percentage',
          monthlyTargetCents: item.targetCents ?? undefined,
          isReserve: item.isReserve,
        });
        savingBucketIds.push(id);
      }

      const freeSpendId = await createBucket({
        name: freeSpendName.trim() || 'Gastos livres',
        color: colorForIndex(2),
        icon: suggestIcon(freeSpendName),
        kind: 'spending',
        fundingType: 'percentage',
      });

      const rules: AllocationRule[] = [];
      validFixed.forEach((item, i) => {
        rules.push({ bucketId: fixedBucketIds[i], mode: 'fixed', value: item.valueCents ?? 0 });
      });
      const wants = Number.parseInt(wantsPct, 10) || 0;
      rules.push({ bucketId: freeSpendId, mode: 'percentage', value: wants });
      if (savingBucketIds.length > 0) {
        const perGoal = Math.floor(futurePct / savingBucketIds.length);
        savingBucketIds.forEach((id) => rules.push({ bucketId: id, mode: 'percentage', value: perGoal }));
      }

      // Every reliable source shares the same rule set — the safety cascade
      // means whichever deposit lands first tops up the fixed buckets.
      for (const income of validIncomes) {
        await createIncomeSource({
          name: income.name.trim(),
          reliability: 'reliable',
          expectedMonthlyCents: income.amountCents ?? undefined,
          rules,
        });
      }

      if (currentBalanceCents != null) {
        const allocations = allocateIncome(currentBalanceCents, rules, []);
        await recordInitialDistribution(allocations);
      }

      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Erro ao concluir', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        {step > 0 ? (
          <Pressable hitSlop={12} onPress={goBack} style={styles.backTap}>
            <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.backTap} />
        )}
        <StepProgress total={STEP_COUNT} current={step} />
        <View style={styles.backTap} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View
          key={step}
          entering={(direction === 1 ? SlideInRight : SlideInLeft).duration(260)}
          exiting={(direction === 1 ? SlideOutLeft : SlideOutRight).duration(180)}
        >
          <View style={styles.iconWrap}>
            <AnimatedLucideIcon name={STEP_ICON[step]} replayKey={step} />
          </View>

          {step === 0 ? (
            <View style={styles.stepBlock}>
              <Text style={styles.title}>Suas rendas</Text>
              <Text style={styles.explain}>
                Quanto cai todo mês, e de onde? Some tudo que é previsível — salário, estágio,
                mensalidade. É a base que banca seus fixos.
              </Text>
              {incomes.map((item, i) => (
                <View key={i} style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    placeholder="Ex: Estágio"
                    placeholderTextColor={colors.textMuted}
                    value={item.name}
                    onChangeText={(v) => updateIncome(i, { name: v })}
                  />
                  <MoneyInput
                    style={styles.amountField}
                    placeholder="R$/mês"
                    valueCents={item.amountCents}
                    onChangeCents={(c) => updateIncome(i, { amountCents: c })}
                  />
                </View>
              ))}
              <Pressable style={styles.addRow} onPress={() => setIncomes((items) => [...items, { name: '', amountCents: null }])}>
                <Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.addLink}>Adicionar outra renda</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stepBlock}>
              <Text style={styles.title}>Seus custos fixos</Text>
              <Text style={styles.explain}>Contas que você tem que pagar todo mês. Elas são cobertas primeiro, sempre.</Text>
              {fixedItems.map((item, i) => (
                <View key={i} style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    placeholder="Ex: internet"
                    placeholderTextColor={colors.textMuted}
                    value={item.name}
                    onChangeText={(v) => updateFixed(i, { name: v })}
                  />
                  <MoneyInput
                    style={styles.amountField}
                    placeholder="R$"
                    valueCents={item.valueCents}
                    onChangeCents={(c) => updateFixed(i, { valueCents: c })}
                  />
                </View>
              ))}
              <Pressable style={styles.addRow} onPress={() => setFixedItems((items) => [...items, { name: '', valueCents: null }])}>
                <Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.addLink}>Adicionar outro fixo</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepBlock}>
              <Text style={styles.title}>Suas metas</Text>
              <Text style={styles.explain}>O que você quer guardar? Marque "reserva" pra emergências.</Text>
              {savingItems.map((item, i) => (
                <View key={i} style={styles.savingRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: emergência da moto"
                    placeholderTextColor={colors.textMuted}
                    value={item.name}
                    onChangeText={(v) => updateSaving(i, { name: v })}
                  />
                  <View style={styles.row}>
                    <MoneyInput
                      style={styles.flex1}
                      placeholder="Meta em R$ (opcional)"
                      valueCents={item.targetCents}
                      onChangeCents={(c) => updateSaving(i, { targetCents: c })}
                    />
                    <Pressable
                      style={[styles.reserveToggle, item.isReserve && styles.reserveToggleOn]}
                      onPress={() => updateSaving(i, { isReserve: !item.isReserve })}
                    >
                      <Text style={item.isReserve ? styles.reserveTextOn : styles.reserveText}>reserva</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                style={styles.addRow}
                onPress={() => setSavingItems((items) => [...items, { name: '', targetCents: null, isReserve: false }])}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.addLink}>Adicionar outra meta</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepBlock}>
              <Text style={styles.title}>O que sobra</Text>
              <Text style={styles.explain}>
                Depois dos fixos, sugerimos {wantsPct}% livre e {futurePct}% pras suas metas.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do bolso de gasto livre"
                placeholderTextColor={colors.textMuted}
                value={freeSpendName}
                onChangeText={setFreeSpendName}
              />
              <View style={styles.row}>
                <Text style={styles.pctLabel}>% pra gasto livre</Text>
                <TextInput
                  style={[styles.input, styles.amountField]}
                  keyboardType="number-pad"
                  value={wantsPct}
                  onChangeText={setWantsPct}
                />
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.stepBlock}>
              <Text style={styles.title}>Dia zero</Text>
              <Text style={styles.explain}>
                Quanto você já tem hoje? Todo real merece uma missão — vamos distribuir esse saldo nos seus bolsos.
              </Text>
              <MoneyInput
                placeholder="Saldo atual (opcional)"
                valueCents={currentBalanceCents}
                onChangeCents={setCurrentBalanceCents}
              />
            </View>
          ) : null}

          {step === 5 ? (
            <View style={styles.stepBlock}>
              <Text style={styles.title}>Tudo pronto</Text>
              {preview.totalCents > 0 ? (
                <>
                  <Text style={styles.explain}>
                    Com {formatCents(preview.totalCents)} por mês, é assim que o Grove vai dividir:
                  </Text>
                  <View style={styles.previewList}>
                    {preview.rows.map((row) => (
                      <View key={row.label} style={styles.previewRow}>
                        <View style={styles.previewHeader}>
                          <View style={styles.previewLabelWrap}>
                            <View style={[styles.previewDot, { backgroundColor: row.color }]} />
                            <Text style={styles.previewLabel}>{row.label}</Text>
                          </View>
                          <Text style={styles.previewAmount}>{formatCents(row.amountCents)}</Text>
                        </View>
                        <View style={styles.previewTrack}>
                          <View
                            style={[
                              styles.previewFill,
                              {
                                backgroundColor: row.color,
                                width: `${Math.round((row.amountCents / preview.totalCents) * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.explain}>
                  Seus bolsos estão prontos. Assim que uma renda entrar, o Grove divide automaticamente.
                </Text>
              )}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step < STEP_COUNT - 1 ? (
          <PrimaryButton label="Continuar" onPress={goNext} />
        ) : (
          <PrimaryButton label={saving ? 'Criando...' : 'Concluir'} onPress={finish} disabled={saving} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backTap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  iconWrap: { alignItems: 'center', marginBottom: spacing.sm },
  stepBlock: { gap: spacing.md },
  title: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 26, textAlign: 'center' },
  explain: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
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
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  flex1: { flex: 1 },
  amountField: { width: 110 },
  savingRow: { gap: spacing.xs },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  addLink: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 14 },
  reserveToggle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  reserveToggleOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  reserveText: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 12 },
  reserveTextOn: { color: colors.textOnLight, fontFamily: fontFamily.medium, fontSize: 12 },
  pctLabel: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 14, flex: 1 },
  previewList: { gap: spacing.md, marginTop: spacing.xs },
  previewRow: { gap: spacing.xs },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewDot: { width: 9, height: 9, borderRadius: 5 },
  previewLabel: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 14 },
  previewAmount: { color: colors.textSecondary, fontFamily: fontFamily.semibold, fontSize: 14 },
  previewTrack: { height: 6, borderRadius: radii.pill, backgroundColor: '#18181b', overflow: 'hidden' },
  previewFill: { height: '100%', borderRadius: radii.pill },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
