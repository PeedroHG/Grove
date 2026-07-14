import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { mergeBucketsWithBalances } from '@/features/buckets/withBalance';
import { useBucketBalances } from '@/features/ledger/hooks';
import { colors, fontFamily, spacing } from '@/theme/tokens';

export default function MetasScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const { data: balanceRows } = useBucketBalances();

  const buckets = useMemo(
    () => mergeBucketsWithBalances(bucketRows ?? [], balanceRows ?? []),
    [bucketRows, balanceRows],
  );

  const savingBuckets = buckets.filter((b) => b.kind === 'saving');
  const reserveBuckets = savingBuckets.filter((b) => b.isReserve);

  const reserveCurrent = reserveBuckets.reduce((acc, b) => acc + Math.max(0, b.balanceCents), 0);
  const reserveTarget = reserveBuckets.reduce((acc, b) => acc + (b.monthlyTargetCents ?? 0), 0);
  const reserveProgress = reserveTarget > 0 ? reserveCurrent / reserveTarget : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroWrap}>
        <ProgressRing progress={reserveProgress} />
        <View style={styles.heroCenter} pointerEvents="none">
          <Text style={styles.heroPct}>{Math.round(reserveProgress * 100)}%</Text>
          <Text style={styles.heroLabel}>da reserva</Text>
        </View>
      </View>
      <AmountText cents={reserveCurrent} size="balance" style={styles.heroAmount} />

      <Text style={styles.sectionTitle}>Suas metas</Text>
      {savingBuckets.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Nenhuma meta ainda. Configure suas metas nos Ajustes pra começar a guardar.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {savingBuckets.map((bucket) => {
            const target = bucket.monthlyTargetCents ?? 0;
            const progress = target > 0 ? bucket.balanceCents / target : 0;
            return (
              <Pressable key={bucket.id} onPress={() => router.push(`/bolso/${bucket.id}`)}>
                <Card style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
                    <AmountText cents={bucket.balanceCents} size="body" />
                  </View>
                  <ProgressBar progress={progress} />
                  {target > 0 ? (
                    <Text style={styles.goalTarget}>meta: {(target / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      <PrimaryButton label="Nova meta" onPress={() => router.push('/ajustes')} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2, gap: spacing.md, alignItems: 'stretch' },
  heroWrap: { alignSelf: 'center', marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  heroCenter: { position: 'absolute', alignItems: 'center' },
  heroPct: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 30 },
  heroLabel: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  heroAmount: { alignSelf: 'center', marginBottom: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17 },
  list: { gap: spacing.sm },
  goalCard: { gap: spacing.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalTarget: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14 },
});
