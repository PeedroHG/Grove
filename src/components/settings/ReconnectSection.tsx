import { useLiveQuery } from 'drizzle-orm/expo-sqlite/query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { bankLinkedAccountsQuery } from '@/features/accounts/queries';
import { colors, fontFamily, spacing } from '@/theme/tokens';

/**
 * Open Finance consent expires roughly every 12 months (Banco Central
 * rule) — not something Pluggy or Grove controls. We warn a bit early
 * (330 days) so a reconnect doesn't catch you mid-month with no bank sync.
 */
const CONSENT_WARNING_DAYS = 330;

export function ReconnectSection() {
  const { data: linkedAccounts } = useLiveQuery(bankLinkedAccountsQuery());

  const stale = (linkedAccounts ?? []).filter((account) => {
    const daysLinked = (Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysLinked >= CONSENT_WARNING_DAYS;
  });

  if (stale.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Reconexão do banco</Text>
      <Text style={styles.explain}>
        O consentimento de Open Finance expira ~12 meses depois de conectado. Estas contas estão
        perto disso — reconecte pra não perder a sincronização automática.
      </Text>
      {stale.map((account) => (
        <View key={account.id} style={styles.row}>
          <Text style={styles.accountName}>{account.name}</Text>
          <PrimaryButton
            label="Reconectar"
            onPress={() =>
              router.push({
                pathname: '/conectar-banco',
                params: { kind: account.kind, itemId: account.pluggyItemId ?? '' },
              })
            }
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 15 },
  explain: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  row: { gap: spacing.xs },
  accountName: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13 },
});
