import { useLocalSearchParams } from 'expo-router';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountText } from '@/components/ui/AmountText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { bucketByIdQuery } from '@/features/buckets/queries';
import { useBucketBalance } from '@/features/ledger/hooks';
import { ledgerHistoryQuery } from '@/features/ledger/queries';
import { formatCents } from '@/lib/money';
import { colors, fontFamily, spacing } from '@/theme/tokens';

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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Chip label={bucket.name} color={bucket.color} icon={bucket.icon as never} />

      <Card style={styles.balanceCard}>
        <Text style={styles.label}>SALDO</Text>
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
                <Text style={styles.historyDate}>
                  {new Date(entry.occurredAt).toLocaleDateString('pt-BR')}
                </Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  label: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
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
