import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { incomeSourcesQuery } from '@/features/incomeSources/queries';
import { recordCashExpense, recordCashIncome } from '@/features/ledger/mutations';
import { formatCents } from '@/lib/money';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';

type TxType = 'expense' | 'income';

export default function NovaTransacaoScreen() {
  const [type, setType] = useState<TxType>('expense');
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [bucketId, setBucketId] = useState<string | null>(null);
  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(null);
  const [narration, setNarration] = useState<string[] | null>(null);

  const { data: bucketRows } = useActiveBuckets();
  const { data: sourceRows } = useLiveQuery(incomeSourcesQuery());

  const spendingBuckets = useMemo(
    () => (bucketRows ?? []).filter((b) => b.kind === 'spending' && b.id !== UNALLOCATED_BUCKET_ID),
    [bucketRows],
  );

  const canSave = type === 'expense' ? Boolean(amountCents && bucketId) : Boolean(amountCents);

  const handleSave = async () => {
    if (!amountCents) return;

    if (type === 'expense') {
      if (!bucketId) return;
      await recordCashExpense({ bucketId, amountCents, description: description || 'Gasto em dinheiro' });
      router.back();
      return;
    }

    const result = await recordCashIncome({
      amountCents,
      incomeSourceId: incomeSourceId ?? undefined,
      description,
    });

    const lines = result.allocations.map((a) => {
      const bucket = (bucketRows ?? []).find((b) => b.id === a.bucketId);
      const label = a.bucketId === UNALLOCATED_BUCKET_ID ? 'a distribuir' : bucket?.name ?? '?';
      return `${label}: ${formatCents(a.amountCents)}`;
    });
    setNarration(lines);
  };

  if (narration) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Dividi assim:</Text>
          {narration.map((line) => (
            <Text key={line} style={styles.narrationLine}>
              • {line}
            </Text>
          ))}
          <PrimaryButton label="Entendi" onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Saída" active={type === 'expense'} onPress={() => setType('expense')} />
          <SegmentButton label="Entrada" active={type === 'income'} onPress={() => setType('income')} />
        </View>

        <MoneyInput
          style={styles.amountInput}
          valueCents={amountCents}
          onChangeCents={setAmountCents}
          autoFocus
        />

        {type === 'expense' ? (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>BOLSO</Text>
            <View style={styles.chipWrap}>
              {spendingBuckets.map((bucket) => (
                <Pressable key={bucket.id} onPress={() => setBucketId(bucket.id)}>
                  <View style={bucketId === bucket.id ? styles.chipSelected : undefined}>
                    <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>FONTE (opcional)</Text>
            <View style={styles.chipWrap}>
              {(sourceRows ?? []).map((source) => (
                <Pressable key={source.id} onPress={() => setIncomeSourceId(source.id)}>
                  <View style={incomeSourceId === source.id ? styles.chipSelected : undefined}>
                    <Chip label={source.name} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>DESCRIÇÃO</Text>
          <TextInput
            style={styles.input}
            placeholder="Opcional"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <PrimaryButton label="Salvar transação" onPress={handleSave} disabled={!canSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonOn]} onPress={onPress}>
      <Text style={[styles.segmentLabel, active && styles.segmentLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 20, marginBottom: spacing.sm },
  narrationLine: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 15 },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentButtonOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  segmentLabel: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 14 },
  segmentLabelOn: { color: colors.textOnLight },
  amountInput: {
    fontSize: 44,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textShadowColor: 'rgba(250, 250, 250, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  fieldBlock: { gap: spacing.sm },
  fieldLabel: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipSelected: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
});
