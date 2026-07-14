import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { mergeBucketsWithBalances } from '@/features/buckets/withBalance';
import { useBucketBalances } from '@/features/ledger/hooks';
import { usePendingExpenses } from '@/features/review/hooks';
import { greeting } from '@/lib/date';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, spacing } from '@/theme/tokens';

export default function DashboardScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const { data: balanceRows } = useBucketBalances();
  const { data: pendingExpenses } = usePendingExpenses();

  const buckets = useMemo(
    () => mergeBucketsWithBalances(bucketRows ?? [], balanceRows ?? []),
    [bucketRows, balanceRows],
  );

  const total = buckets.reduce((acc, b) => acc + b.balanceCents, 0);
  const reserveTotal = buckets.filter((b) => b.isReserve).reduce((acc, b) => acc + b.balanceCents, 0);
  const unallocated = buckets.find((b) => b.id === UNALLOCATED_BUCKET_ID)?.balanceCents ?? 0;
  const spendingBuckets = buckets.filter((b) => b.kind === 'spending' && b.id !== UNALLOCATED_BUCKET_ID);
  const hasAnyUserBucket = buckets.some((b) => b.id !== UNALLOCATED_BUCKET_ID);

  // The seed always creates the "A distribuir" bucket, so a loaded DB has ≥1
  // row. An empty list therefore means the live query hasn't resolved yet —
  // NOT "no buckets" — so we only send someone to onboarding once rows exist
  // but none are user-created. (Without this guard the first empty tick after
  // finishing onboarding bounced the user straight back to step 1.)
  const loaded = (bucketRows?.length ?? 0) > 0;

  useEffect(() => {
    if (loaded && !hasAnyUserBucket) {
      router.replace('/onboarding');
    }
  }, [loaded, hasAnyUserBucket]);

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{greeting()}</Text>
      <Text style={styles.date}>{dateLabel}</Text>

      <Card style={styles.balanceCard}>
        <Text style={styles.label}>SALDO TOTAL</Text>
        <AmountText cents={total} size="hero" />
      </Card>

      <View style={styles.row}>
        <Card style={styles.secondaryCard}>
          <Text style={styles.label}>RESERVA</Text>
          <AmountText cents={reserveTotal} size="body" />
        </Card>
        <Card style={styles.secondaryCard}>
          <Text style={styles.label}>A DISTRIBUIR</Text>
          <AmountText cents={unallocated} size="body" />
        </Card>
      </View>

      {pendingExpenses && pendingExpenses.length > 0 ? (
        <Pressable onPress={() => router.push('/revisao')}>
          <Card style={styles.reviewBanner}>
            <Text style={styles.reviewText}>
              {pendingExpenses.length} gasto(s) esperando revisão →
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Bolsos</Text>
      {spendingBuckets.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Nenhum bolso ainda. Configure seus bolsos nos Ajustes pra começar.
          </Text>
        </Card>
      ) : (
        <View style={styles.bucketList}>
          {spendingBuckets.map((bucket) => (
            <Pressable key={bucket.id} onPress={() => router.push(`/bolso/${bucket.id}`)}>
              <Card style={styles.bucketRow}>
                <View style={styles.bucketInfo}>
                  <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
                </View>
                <AmountText cents={bucket.balanceCents} size="body" />
              </Card>
            </Pressable>
          ))}
        </View>
      )}

    </ScrollView>
      <Pressable style={styles.fab} onPress={() => router.push('/nova-transacao')}>
        <Ionicons name="add" size={26} color={colors.textOnLight} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  greeting: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 15 },
  date: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13, marginBottom: spacing.sm },
  balanceCard: { gap: spacing.xs },
  label: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  row: { flexDirection: 'row', gap: spacing.md },
  secondaryCard: { flex: 1, gap: spacing.xs },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    marginTop: spacing.sm,
  },
  bucketList: { gap: spacing.sm },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  bucketInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewBanner: { borderColor: colors.textPrimary },
  reviewText: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 13 },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
