import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { useMonthlySpendByBucket } from '@/features/reports/hooks';
import { formatCents } from '@/lib/money';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, spacing } from '@/theme/tokens';

export default function RelatoriosScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const { data: spendRows } = useMonthlySpendByBucket();

  const ranked = useMemo(() => {
    const bucketById = new Map((bucketRows ?? []).map((b) => [b.id, b]));
    return (spendRows ?? [])
      .filter((row) => row.bucketId !== UNALLOCATED_BUCKET_ID && row.spentCents > 0)
      .map((row) => ({ ...row, bucket: bucketById.get(row.bucketId) }))
      .filter((row) => row.bucket);
  }, [bucketRows, spendRows]);

  const maxSpent = ranked.reduce((max, r) => Math.max(max, r.spentCents), 0);
  const totalSpent = ranked.reduce((acc, r) => acc + r.spentCents, 0);
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton />
      <Text style={styles.title}>Relatório do mês</Text>
      <Text style={styles.subtitle}>{monthLabel}</Text>

      <Card style={styles.totalCard}>
        <Text style={styles.label}>TOTAL GASTO NO MÊS</Text>
        <AmountText cents={-totalSpent} size="hero" />
      </Card>

      <Text style={styles.sectionTitle}>Por bolso</Text>
      {ranked.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nenhum gasto registrado este mês ainda.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {ranked.map((row) => (
            <Card key={row.bucketId} style={styles.row}>
              <View style={styles.rowHeader}>
                <Chip label={row.bucket!.name} color={row.bucket!.color} icon={row.bucket!.icon as never} />
                <Text style={styles.amount}>{formatCents(row.spentCents)}</Text>
              </View>
              <ProgressBar progress={maxSpent > 0 ? row.spentCents / maxSpent : 0} />
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  title: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 22 },
  subtitle: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13, marginBottom: spacing.sm, textTransform: 'capitalize' },
  totalCard: { gap: spacing.xs },
  label: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  sectionTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17, marginTop: spacing.sm },
  list: { gap: spacing.sm },
  row: { gap: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 15 },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14 },
});
