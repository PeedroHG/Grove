import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { usePendingExpenses } from '@/features/review/hooks';
import { confirmExpenseReview } from '@/features/review/mutations';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, spacing } from '@/theme/tokens';

export default function RevisaoScreen() {
  const { data: pending } = usePendingExpenses();
  const { data: bucketRows } = useActiveBuckets();
  const [selection, setSelection] = useState<Record<string, string>>({});

  const spendingBuckets = (bucketRows ?? []).filter((b) => b.kind === 'spending' && b.id !== UNALLOCATED_BUCKET_ID);

  const handleConfirm = async (expenseId: string) => {
    const bucketId = selection[expenseId];
    if (!bucketId) return;
    await confirmExpenseReview({ expenseId, bucketId });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Fila de revisão</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.explain}>
          Gastos que o Grove puxou do banco mas não teve certeza do bolso. Escolha e confirme —
          da próxima vez que esse estabelecimento aparecer, ele categoriza sozinho.
        </Text>

        {!pending || pending.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Nada pra revisar por enquanto.</Text>
          </Card>
        ) : (
          pending.map((expense) => (
            <Card key={expense.id} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.merchant}>{expense.description}</Text>
                <AmountText cents={-expense.amountCents} size="body" />
              </View>
              <Text style={styles.date}>{new Date(expense.occurredAt).toLocaleDateString('pt-BR')}</Text>
              <View style={styles.chipWrap}>
                {spendingBuckets.map((bucket) => (
                  <Pressable
                    key={bucket.id}
                    onPress={() => setSelection((s) => ({ ...s, [expense.id]: bucket.id }))}
                  >
                    <View style={selection[expense.id] === bucket.id ? styles.chipSelected : undefined}>
                      <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
                    </View>
                  </Pressable>
                ))}
              </View>
              <PrimaryButton
                label="Confirmar"
                onPress={() => handleConfirm(expense.id)}
                disabled={!selection[expense.id]}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  title: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17 },
  explain: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  item: { gap: spacing.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchant: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 14, flexShrink: 1 },
  date: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipSelected: { borderRadius: 999, borderWidth: 1, borderColor: colors.textPrimary },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14 },
});
