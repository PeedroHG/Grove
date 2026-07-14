import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SyncSection } from '@/components/settings/SyncSection';
import { ReconnectSection } from '@/components/settings/ReconnectSection';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { createBucket } from '@/features/buckets/mutations';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { colorForIndex, suggestIcon } from '@/features/buckets/palette';
import { resetAllData } from '@/features/dev/reset';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

export default function AjustesScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const buckets = (bucketRows ?? []).filter((b) => b.id !== UNALLOCATED_BUCKET_ID);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<'spending' | 'saving'>('spending');
  const [fundingType, setFundingType] = useState<'fixed' | 'percentage'>('percentage');
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [isReserve, setIsReserve] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createBucket({
      name: name.trim(),
      color: colorForIndex(buckets.length),
      icon: suggestIcon(name),
      kind,
      fundingType,
      monthlyTargetCents: fundingType === 'fixed' && valueCents != null ? valueCents : undefined,
      isReserve: kind === 'saving' && isReserve,
      sortOrder: buckets.length,
    });
    setName('');
    setValueCents(null);
    setIsReserve(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Seus bolsos</Text>
      <View style={styles.chipWrap}>
        {buckets.map((bucket) => (
          <Chip key={bucket.id} label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
        ))}
        {buckets.length === 0 ? <Text style={styles.emptyText}>Nenhum bolso ainda — crie o primeiro abaixo.</Text> : null}
      </View>

      <Card style={styles.form}>
        <Text style={styles.formTitle}>Novo bolso</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome (ex: internet, namorada, guardar)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.segmented}>
          <SegmentButton label="Gasto" active={kind === 'spending'} onPress={() => setKind('spending')} />
          <SegmentButton label="Guardar" active={kind === 'saving'} onPress={() => setKind('saving')} />
        </View>

        <View style={styles.segmented}>
          <SegmentButton label="Fixo" active={fundingType === 'fixed'} onPress={() => setFundingType('fixed')} />
          <SegmentButton
            label="Porcentagem"
            active={fundingType === 'percentage'}
            onPress={() => setFundingType('percentage')}
          />
        </View>

        {fundingType === 'fixed' ? (
          <MoneyInput placeholder="Meta mensal (ex: R$ 100,00)" valueCents={valueCents} onChangeCents={setValueCents} />
        ) : null}

        {kind === 'saving' ? (
          <Pressable style={styles.checkboxRow} onPress={() => setIsReserve((v) => !v)}>
            <View style={[styles.checkbox, isReserve && styles.checkboxOn]} />
            <Text style={styles.checkboxLabel}>Conta no anel de reserva</Text>
          </Pressable>
        ) : null}

        <PrimaryButton label="Criar bolso" onPress={handleCreate} disabled={!name.trim()} />
      </Card>

      <SyncSection />

      <Card style={styles.form}>
        <Text style={styles.formTitle}>Conectar Nubank</Text>
        <Text style={styles.emptyText}>
          Precisa da sincronização configurada acima primeiro. Conecte PJ (renda) e PF (cartão)
          separadamente — cada uma é uma conexão independente.
        </Text>
        <PrimaryButton label="Conectar Nubank PJ" onPress={() => router.push({ pathname: '/conectar-banco', params: { kind: 'pj' } })} />
        <PrimaryButton label="Conectar Nubank PF" onPress={() => router.push({ pathname: '/conectar-banco', params: { kind: 'pf' } })} />
      </Card>

      <ReconnectSection />

      <Card style={styles.form}>
        <Text style={styles.formTitle}>Zona de teste</Text>
        <Text style={styles.emptyText}>
          Apaga todos os dados locais (bolsos, rendas, lançamentos) e reinicia o onboarding.
          Útil enquanto ajustamos o app.
        </Text>
        <Pressable
          style={styles.dangerButton}
          onPress={() =>
            Alert.alert('Recomeçar do zero?', 'Isso apaga tudo neste aparelho e volta ao onboarding.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Apagar tudo',
                style: 'destructive',
                onPress: async () => {
                  await resetAllData();
                  router.replace('/onboarding');
                },
              },
            ])
          }
        >
          <Text style={styles.dangerLabel}>Recomeçar do zero</Text>
        </Pressable>
      </Card>
    </ScrollView>
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
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  title: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 17 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13 },
  form: { gap: spacing.sm },
  formTitle: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 15, marginBottom: spacing.xs },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.negative,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerLabel: { color: colors.negative, fontFamily: fontFamily.semibold, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentButtonOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  segmentLabel: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13 },
  segmentLabelOn: { color: colors.textOnLight },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: colors.border },
  checkboxOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  checkboxLabel: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 13 },
});
