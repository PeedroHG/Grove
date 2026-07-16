import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { markBillPaid } from '@/features/bills/mutations';
import { bucketType } from '@/features/buckets/classify';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { incomeSourcesQuery } from '@/features/incomeSources/queries';
import {
  previewIncomeAllocation,
  recordCashExpense,
  recordCashIncome,
} from '@/features/ledger/mutations';
import { formatCents } from '@/lib/money';
import { type Allocation, UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

type TxType = 'expense' | 'income';

export default function NovaTransacaoScreen() {
  const [type, setType] = useState<TxType>('income');
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [bucketId, setBucketId] = useState<string | null>(null);
  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Allocation[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: bucketRows } = useActiveBuckets();
  const { data: sourceRows } = useLiveQuery(incomeSourcesQuery());

  const spendingBuckets = useMemo(
    () => (bucketRows ?? []).filter((b) => b.kind === 'spending' && b.id !== UNALLOCATED_BUCKET_ID),
    [bucketRows],
  );
  const despesaBuckets = useMemo(() => spendingBuckets.filter((b) => bucketType(b) === 'despesa'), [spendingBuckets]);
  const bolsoBuckets = useMemo(() => spendingBuckets.filter((b) => bucketType(b) === 'bolso'), [spendingBuckets]);
  const bucketById = useMemo(() => new Map((bucketRows ?? []).map((b) => [b.id, b])), [bucketRows]);
  const selectedIsBill = bucketId ? bucketById.get(bucketId) && bucketType(bucketById.get(bucketId)!) === 'despesa' : false;

  useEffect(() => {
    if (incomeSourceId || !sourceRows || sourceRows.length === 0) return;
    const reliable = sourceRows.find((s) => s.reliability === 'reliable');
    setIncomeSourceId((reliable ?? sourceRows[0]).id);
  }, [sourceRows, incomeSourceId]);

  useEffect(() => {
    if (type !== 'income' || !amountCents) {
      setPreview([]);
      return;
    }
    let active = true;
    previewIncomeAllocation(amountCents, incomeSourceId ?? undefined)
      .then((allocs) => active && setPreview(allocs))
      .catch(() => active && setPreview([]));
    return () => {
      active = false;
    };
  }, [type, amountCents, incomeSourceId]);

  const canSave = type === 'expense' ? Boolean(amountCents && bucketId) : Boolean(amountCents);

  const handleSave = async () => {
    if (!amountCents || saving) return;
    setSaving(true);
    try {
      if (type === 'expense') {
        if (!bucketId) return;
        const isBill = bucketType(bucketById.get(bucketId)!) === 'despesa';
        await recordCashExpense({
          bucketId,
          amountCents,
          description: description || (isBill ? 'Pagamento de conta' : 'Gasto em dinheiro'),
        });
        // Recording a real payment against a bill also settles it for the month.
        if (isBill) await markBillPaid(bucketId, amountCents);
      } else {
        await recordCashIncome({ amountCents, incomeSourceId: incomeSourceId ?? undefined, description });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.topTitle}>Nova transação</Text>
        <View style={styles.close} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.segmented}>
          <SegmentButton label="Entrada" active={type === 'income'} onPress={() => setType('income')} />
          <SegmentButton label="Saída" active={type === 'expense'} onPress={() => setType('expense')} />
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{type === 'income' ? 'QUANTO ENTROU' : 'QUANTO GASTOU'}</Text>
          <MoneyInput style={styles.amountInput} valueCents={amountCents} onChangeCents={setAmountCents} autoFocus />
        </View>

        {type === 'expense' ? (
          <>
            {despesaBuckets.length > 0 ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>PAGAR UMA CONTA</Text>
                <View style={styles.chipWrap}>
                  {despesaBuckets.map((bucket) => (
                    <Pressable key={bucket.id} onPress={() => setBucketId(bucket.id)}>
                      <View style={bucketId === bucket.id ? styles.chipSelected : undefined}>
                        <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} size="md" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {bolsoBuckets.length > 0 ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>OU GASTAR DE UM BOLSO</Text>
                <View style={styles.chipWrap}>
                  {bolsoBuckets.map((bucket) => (
                    <Pressable key={bucket.id} onPress={() => setBucketId(bucket.id)}>
                      <View style={bucketId === bucket.id ? styles.chipSelected : undefined}>
                        <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} size="md" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {sourceRows && sourceRows.length > 1 ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>FONTE</Text>
                <View style={styles.chipWrap}>
                  {sourceRows.map((source) => (
                    <Pressable key={source.id} onPress={() => setIncomeSourceId(source.id)}>
                      <View style={incomeSourceId === source.id ? styles.chipSelected : undefined}>
                        <Chip label={source.name} color={colors.textSecondary} size="md" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>DIVISÃO SUGERIDA</Text>
              {amountCents && preview.length > 0 ? (
                <View style={styles.previewList}>
                  {preview.map((a, i) => {
                    const bucket = bucketById.get(a.bucketId);
                    const name = a.bucketId === UNALLOCATED_BUCKET_ID ? 'A distribuir' : bucket?.name ?? '?';
                    const color = bucket?.color ?? colors.textMuted;
                    return (
                      <View
                        key={a.bucketId}
                        style={[styles.previewRow, i < preview.length - 1 && styles.previewRowBorder]}
                      >
                        <View style={styles.previewLeft}>
                          <View style={[styles.dot, { backgroundColor: color }]} />
                          <Text style={styles.previewName}>{name}</Text>
                        </View>
                        <Text style={styles.previewValue}>{formatCents(a.amountCents)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.previewEmpty}>
                  <Ionicons name="pie-chart-outline" size={26} color={colors.textMuted} />
                  <Text style={styles.previewHint}>
                    Digite um valor pra ver como o Grove divide entre seus bolsos.
                  </Text>
                </View>
              )}
            </View>
          </>
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
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={
            saving
              ? 'Salvando...'
              : type === 'income'
                ? 'Confirmar entrada'
                : selectedIsBill
                  ? 'Pagar conta'
                  : 'Salvar saída'
          }
          onPress={handleSave}
          disabled={!canSave || saving}
        />
      </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 16 },
  content: { padding: spacing.lg, gap: spacing.xl },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  segmentButtonOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  segmentLabel: { color: colors.textSecondary, fontFamily: fontFamily.semibold, fontSize: 15 },
  segmentLabelOn: { color: colors.textOnLight },
  amountBlock: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  amountLabel: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 12, letterSpacing: 0.8 },
  amountInput: {
    fontSize: 56,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textShadowColor: 'rgba(250, 250, 250, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
    textAlign: 'center',
  },
  fieldBlock: { gap: spacing.md },
  fieldLabel: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipSelected: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.textPrimary },
  previewList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
  },
  previewRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  previewLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  previewName: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 15 },
  previewValue: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 15 },
  previewEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewHint: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
