import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { mergeBucketsWithBalances } from '@/features/buckets/withBalance';
import { useBucketBalances } from '@/features/ledger/hooks';
import { formatCents } from '@/lib/money';
import { chipBackground, colors, fontFamily, spacing } from '@/theme/tokens';

export default function MetasScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const { data: balanceRows } = useBucketBalances();

  const buckets = useMemo(
    () => mergeBucketsWithBalances(bucketRows ?? [], balanceRows ?? []),
    [bucketRows, balanceRows],
  );

  const savingBuckets = buckets.filter((b) => b.kind === 'saving');
  const reserveBuckets = savingBuckets.filter((b) => b.isReserve);
  const goalBuckets = savingBuckets.filter((b) => !b.isReserve);
  const reserveTotal = reserveBuckets.reduce((acc, b) => acc + Math.max(0, b.balanceCents), 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton title="Metas" />

        {/* Reserve: open-ended, no progress bar — just what's accumulated. */}
        <Card style={styles.reserveCard}>
          <View style={styles.reserveHeader}>
            <View style={[styles.reserveIcon, { backgroundColor: chipBackground(colors.accent) }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
            </View>
            <Text style={styles.reserveLabel}>Sua reserva</Text>
          </View>
          <AmountText cents={reserveTotal} size="hero" />
          <Text style={styles.reserveHint}>
            {reserveBuckets.length > 0
              ? 'Guardada aos poucos, sem prazo — é o seu colchão de segurança.'
              : 'Você ainda não tem uma reserva. Crie uma nos Ajustes pra começar a se proteger.'}
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Suas metas</Text>
        {goalBuckets.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              Nenhuma meta com valor alvo ainda. Crie uma (iPhone, viagem...) pra ver a barra encher.
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {goalBuckets.map((bucket) => {
              const target = bucket.monthlyTargetCents ?? 0;
              const progress = target > 0 ? bucket.balanceCents / target : 0;
              return (
                <Pressable key={bucket.id} onPress={() => router.push(`/bolso/${bucket.id}`)}>
                  <Card style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
                      <AmountText cents={bucket.balanceCents} size="body" />
                    </View>
                    {target > 0 ? (
                      <>
                        <ProgressBar progress={progress} />
                        <View style={styles.goalFooter}>
                          <Text style={styles.goalPct}>{Math.round(progress * 100)}%</Text>
                          <Text style={styles.goalTarget}>meta: {formatCents(target)}</Text>
                        </View>
                      </>
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
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  reserveCard: { gap: spacing.sm },
  reserveHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reserveIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reserveLabel: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 14 },
  reserveHint: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  sectionTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17, marginTop: spacing.sm },
  list: { gap: spacing.sm },
  goalCard: { gap: spacing.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalPct: { color: colors.textSecondary, fontFamily: fontFamily.semibold, fontSize: 12 },
  goalTarget: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14 },
});
