import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText, MONEY_MASK } from '@/components/ui/AmountText';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useRecentActivity, type ActivityItem } from '@/features/activity/hooks';
import { billState, usePaidBillIds } from '@/features/bills/hooks';
import { markBillPaid, unmarkBillPaid } from '@/features/bills/mutations';
import { bucketType } from '@/features/buckets/classify';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { mergeBucketsWithBalances, type BucketWithBalance } from '@/features/buckets/withBalance';
import { useBucketBalances } from '@/features/ledger/hooks';
import { useProfile } from '@/features/profile/queries';
import { useMonthlyStats } from '@/features/reports/monthly';
import { usePendingExpenses } from '@/features/review/hooks';
import { greeting } from '@/lib/date';
import { chipBackground, colors, fontFamily, radii, spacing } from '@/theme/tokens';
import { formatCents } from '@/lib/money';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';

interface QuickActionDef {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}

export default function DashboardScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const { data: balanceRows } = useBucketBalances();
  const { data: pendingExpenses } = usePendingExpenses();
  const profileRow = useProfile();
  const monthly = useMonthlyStats();
  const activity = useRecentActivity();
  const paidBillIds = usePaidBillIds();
  const [hidden, setHidden] = useState(false);
  const mask = (cents: number) => (hidden ? MONEY_MASK : formatCents(cents));

  const buckets = useMemo(
    () => mergeBucketsWithBalances(bucketRows ?? [], balanceRows ?? []),
    [bucketRows, balanceRows],
  );

  const total = buckets.reduce((acc, b) => acc + b.balanceCents, 0);
  const reserveTotal = buckets.filter((b) => b.isReserve).reduce((acc, b) => acc + b.balanceCents, 0);
  const unallocated = buckets.find((b) => b.id === UNALLOCATED_BUCKET_ID)?.balanceCents ?? 0;
  const userBuckets = buckets.filter((b) => b.id !== UNALLOCATED_BUCKET_ID);
  const despesas = userBuckets.filter((b) => bucketType(b) === 'despesa');
  const bolsos = userBuckets.filter((b) => bucketType(b) === 'bolso');
  const hasAnyUserBucket = userBuckets.length > 0;
  const pendingCount = pendingExpenses?.length ?? 0;

  const loaded = (bucketRows?.length ?? 0) > 0;

  useEffect(() => {
    if (loaded && !hasAnyUserBucket) {
      router.replace('/onboarding');
    }
  }, [loaded, hasAnyUserBucket]);

  const quickActions: QuickActionDef[] = [
    { icon: 'add', label: 'Adicionar', onPress: () => router.push('/nova-transacao'), primary: true },
    { icon: 'flag', label: 'Metas', onPress: () => router.push('/metas') },
    { icon: 'bar-chart', label: 'Relatórios', onPress: () => router.push('/relatorios') },
    { icon: 'settings-outline', label: 'Ajustes', onPress: () => router.push('/ajustes') },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <Avatar uri={profileRow?.avatarUri} size={44} />
          <View style={styles.headerCenter}>
            <Text style={styles.welcome}>{greeting()}</Text>
            <Text style={styles.name}>{profileRow?.name ?? 'Você'}</Text>
          </View>
          <Pressable hitSlop={10} onPress={() => router.push('/revisao')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            {pendingCount > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        {/* subtle dark-emerald balance card */}
        <LinearGradient
          colors={['#123024', '#0a1a13']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.cardTop}>
            <Text style={styles.balanceLabel}>Saldo total</Text>
            <Pressable hitSlop={10} onPress={() => setHidden((h) => !h)}>
              <Ionicons
                name={hidden ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          <Text style={styles.balanceValue}>{hidden ? MONEY_MASK : formatCents(total)}</Text>
          <View style={styles.cardStats}>
            <CardStat label="Entrou no mês" value={mask(monthly.incomeCents)} valueColor={colors.positive} />
            <CardStat label="Saiu no mês" value={mask(monthly.spentCents)} valueColor={colors.negative} />
            <CardStat label="Guardei no mês" value={mask(monthly.savedCents)} />
          </View>
        </LinearGradient>

        {/* quick actions */}
        <View style={styles.quickRow}>
          {quickActions.map((a) => (
            <Pressable key={a.label} style={styles.quickAction} onPress={a.onPress}>
              <View style={[styles.quickCircle, a.primary && styles.quickCirclePrimary]}>
                <Ionicons name={a.icon} size={22} color={a.primary ? colors.textOnLight : colors.textPrimary} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <Card style={styles.secondaryCard}>
            <Text style={styles.label}>RESERVA</Text>
            <AmountText cents={reserveTotal} size="body" hidden={hidden} />
          </Card>
          <Card style={styles.secondaryCard}>
            <Text style={styles.label}>A DISTRIBUIR</Text>
            <AmountText cents={unallocated} size="body" hidden={hidden} />
          </Card>
        </View>

        {/* últimos lançamentos */}
        {activity.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Últimos lançamentos</Text>
            <View style={styles.activityList}>
              {activity.map((item) => (
                <ActivityRow key={`${item.kind}-${item.id}`} item={item} hidden={hidden} />
              ))}
            </View>
          </>
        ) : null}

        {despesas.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Contas a pagar</Text>
            <View style={styles.bucketList}>
              {despesas.map((bucket) => (
                <BillRow key={bucket.id} bucket={bucket} paid={paidBillIds.has(bucket.id)} hidden={hidden} />
              ))}
            </View>
          </>
        ) : null}

        {bolsos.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Bolsos</Text>
            <View style={styles.bucketList}>
              {bolsos.map((bucket) => (
                <BucketRow key={bucket.id} bucket={bucket} hidden={hidden} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CardStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.cardStat}>
      <Text style={styles.cardStatLabel}>{label}</Text>
      <Text style={[styles.cardStatValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function ActivityRow({ item, hidden }: { item: ActivityItem; hidden: boolean }) {
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: chipBackground(item.color) }]}>
        <Ionicons name={item.icon as never} size={16} color={item.color} />
      </View>
      <View style={styles.activityText}>
        <Text style={styles.activityLabel} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={styles.activitySub}>{item.sublabel}</Text>
      </View>
      <Text
        style={[
          styles.activityAmount,
          { color: item.amountCents < 0 ? colors.textPrimary : colors.positive },
        ]}
      >
        {hidden ? MONEY_MASK : `${item.amountCents < 0 ? '' : '+'}${formatCents(item.amountCents)}`}
      </Text>
    </View>
  );
}

function BillRow({ bucket, paid, hidden }: { bucket: BucketWithBalance; paid: boolean; hidden: boolean }) {
  const state = billState(bucket.dueDay, paid);
  const statusColor =
    state.status === 'paid' ? colors.positive : state.status === 'overdue' ? colors.negative : colors.textMuted;
  const statusLabel =
    state.status === 'paid' ? 'Pago' : state.status === 'overdue' ? 'Vencida' : 'Pendente';

  return (
    <Card style={styles.billRow}>
      <Pressable style={styles.billInfo} onPress={() => router.push(`/bolso/${bucket.id}`)}>
        <View style={[styles.billIcon, { backgroundColor: chipBackground(bucket.color) }]}>
          <Ionicons name={bucket.icon as never} size={17} color={bucket.color} />
        </View>
        <View style={styles.billText}>
          <Text style={styles.billName}>{bucket.name}</Text>
          <Text style={[styles.billStatus, { color: statusColor }]}>
            {statusLabel}
            {bucket.dueDay ? ` · vence dia ${bucket.dueDay}` : ''}
          </Text>
        </View>
        <Text style={styles.billAmount}>{hidden ? MONEY_MASK : formatCents(bucket.monthlyTargetCents ?? 0)}</Text>
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => (paid ? unmarkBillPaid(bucket.id) : markBillPaid(bucket.id, bucket.monthlyTargetCents ?? 0))}
        style={[styles.payToggle, paid && styles.payToggleOn]}
      >
        <Ionicons
          name={paid ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={paid ? colors.positive : colors.textMuted}
        />
      </Pressable>
    </Card>
  );
}

function BucketRow({ bucket, hidden }: { bucket: BucketWithBalance; hidden: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/bolso/${bucket.id}`)}>
      <Card style={styles.bucketRow}>
        <View style={styles.bucketInfo}>
          <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
        </View>
        <AmountText cents={bucket.balanceCents} size="body" hidden={hidden} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCenter: { flex: 1, alignItems: 'center' },
  welcome: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13 },
  name: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 17 },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  balanceCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.22)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13 },
  balanceValue: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 38, letterSpacing: -0.5 },
  cardStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cardStat: { flex: 1, gap: 2, alignItems: 'center' },
  cardStatLabel: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 11 },
  cardStatValue: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 13 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  quickCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCirclePrimary: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  quickLabel: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 11 },
  label: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  row: { flexDirection: 'row', gap: spacing.md },
  secondaryCard: { flex: 1, gap: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17 },
  activityList: { gap: spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  activityIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1 },
  activityLabel: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 14 },
  activitySub: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  activityAmount: { fontFamily: fontFamily.semibold, fontSize: 14 },
  bucketList: { gap: spacing.sm },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  bucketInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  billInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  billIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  billText: { flex: 1 },
  billName: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 15 },
  billStatus: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  billAmount: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 14 },
  payToggle: { padding: spacing.xs },
  payToggleOn: {},
});
