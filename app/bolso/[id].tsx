import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { billState, usePaidBillIds } from '@/features/bills/hooks';
import { markBillPaid, setBucketDueDay, unmarkBillPaid } from '@/features/bills/mutations';
import { bucketType } from '@/features/buckets/classify';
import { bucketByIdQuery } from '@/features/buckets/queries';
import { useBucketBalance } from '@/features/ledger/hooks';
import { ledgerHistoryQuery } from '@/features/ledger/queries';
import { formatCents } from '@/lib/money';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

const ENTRY_TYPE_LABEL: Record<string, string> = {
  allocation: 'Alocação de renda',
  expense: 'Gasto',
  transfer_in: 'Transferência recebida',
  transfer_out: 'Transferência enviada',
  adjustment: 'Ajuste (dia zero)',
};

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: bucketRows } = useLiveQuery(bucketByIdQuery(id));
  const { data: balanceRows } = useBucketBalance(id);
  const { data: history } = useLiveQuery(ledgerHistoryQuery(id), [id]);
  const paidBillIds = usePaidBillIds();

  const bucket = bucketRows?.[0];
  const balanceCents = balanceRows?.[0]?.balanceCents ?? 0;

  if (!bucket) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.emptyText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  const target = bucket.monthlyTargetCents ?? 0;
  const progress = target > 0 ? balanceCents / target : 0;
  const isOverspent = balanceCents < 0;
  const isDespesa = bucketType(bucket) === 'despesa';
  const paid = paidBillIds.has(bucket.id);
  const state = billState(bucket.dueDay, paid);
  const statusColor =
    state.status === 'paid' ? colors.positive : state.status === 'overdue' ? colors.negative : colors.textMuted;
  const statusLabel =
    state.status === 'paid' ? 'Paga este mês' : state.status === 'overdue' ? 'Vencida' : 'Pendente este mês';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} size="md" />

        {isDespesa ? (
          <Card style={styles.billCard}>
            <View style={styles.billTop}>
              <View>
                <Text style={styles.label}>CONTA A PAGAR</Text>
                <Text style={styles.billValue}>{formatCents(target)} / mês</Text>
              </View>
              <Text style={[styles.billStatus, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            <DueDayEditor bucketId={bucket.id} dueDay={bucket.dueDay} />

            <Pressable
              style={[styles.payButton, paid && styles.payButtonPaid]}
              onPress={() => (paid ? unmarkBillPaid(bucket.id) : markBillPaid(bucket.id, target))}
            >
              <Ionicons
                name={paid ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={paid ? colors.positive : colors.textOnLight}
              />
              <Text style={[styles.payLabel, paid && styles.payLabelPaid]}>
                {paid ? 'Marcada como paga' : 'Marcar como paga'}
              </Text>
            </Pressable>
          </Card>
        ) : null}

        <Card style={styles.balanceCard}>
          <Text style={styles.label}>{isDespesa ? 'RESERVADO PRA ESSA CONTA' : 'SALDO'}</Text>
          <AmountText cents={balanceCents} size="hero" />
          {isOverspent ? (
            <Text style={styles.overspentHint}>
              Estourado — o próximo aporte cobre esse buraco antes de sobrar.
            </Text>
          ) : null}
          {target > 0 ? (
            <View style={styles.progressWrap}>
              <ProgressBar progress={progress} />
              <Text style={styles.targetHint}>meta: {formatCents(target)}</Text>
            </View>
          ) : null}
        </Card>

        {bucket.kind === 'saving' && bucket.physicalLocation === 'caixinha' ? (
          <Card>
            <Text style={styles.reminderText}>
              Lembre-se de transferir esse valor pra sua Caixinha no Nubank — o Grove ainda não
              confirma isso automaticamente (isso chega na Fase 2, com a leitura via Pluggy).
            </Text>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Histórico</Text>
        {!history || history.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum movimento ainda.</Text>
        ) : (
          <View style={styles.historyList}>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyType}>{ENTRY_TYPE_LABEL[entry.entryType] ?? entry.entryType}</Text>
                  <Text style={styles.historyDate}>{new Date(entry.occurredAt).toLocaleDateString('pt-BR')}</Text>
                </View>
                <AmountText cents={entry.amountCents} size="body" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DueDayEditor({ bucketId, dueDay }: { bucketId: string; dueDay: number | null }) {
  const [value, setValue] = useState(dueDay ? String(dueDay) : '');

  useEffect(() => {
    setValue(dueDay ? String(dueDay) : '');
  }, [dueDay]);

  const persist = () => {
    const parsed = Number.parseInt(value, 10);
    setBucketDueDay(bucketId, parsed >= 1 && parsed <= 31 ? parsed : null);
  };

  return (
    <View style={styles.dueRow}>
      <Text style={styles.dueLabel}>Vence no dia</Text>
      <TextInput
        style={styles.dueInput}
        placeholder="—"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        value={value}
        onChangeText={setValue}
        onEndEditing={persist}
        onBlur={persist}
        maxLength={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  label: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  billCard: { gap: spacing.md },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billValue: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: 20, marginTop: 2 },
  billStatus: { fontFamily: fontFamily.semibold, fontSize: 13 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  dueLabel: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 14 },
  dueInput: {
    minWidth: 56,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textPrimary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  payButtonPaid: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.positive },
  payLabel: { color: colors.textOnLight, fontFamily: fontFamily.bold, fontSize: 15 },
  payLabelPaid: { color: colors.positive },
  balanceCard: { gap: spacing.sm },
  overspentHint: { color: colors.negative, fontFamily: fontFamily.regular, fontSize: 13 },
  progressWrap: { gap: spacing.xs, marginTop: spacing.xs },
  targetHint: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  reminderText: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17 },
  historyList: { gap: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyType: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: 14 },
  historyDate: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12 },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14 },
});
