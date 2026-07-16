import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SyncSection } from '@/components/settings/SyncSection';
import { ReconnectSection } from '@/components/settings/ReconnectSection';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { bucketType, type BucketType } from '@/features/buckets/classify';
import { createBucket } from '@/features/buckets/mutations';
import { useActiveBuckets } from '@/features/buckets/hooks';
import { colorForIndex, suggestIcon } from '@/features/buckets/palette';
import { resetAllData } from '@/features/dev/reset';
import { UNALLOCATED_BUCKET_ID } from '@/shared/engine';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

const GROUP_LABEL: Record<BucketType, string> = {
  despesa: 'Despesas',
  bolso: 'Bolsos',
  meta: 'Metas',
};

const TYPE_HINT: Record<BucketType, string> = {
  despesa: 'Conta fixa que você paga todo mês. É coberta primeiro, antes de dividir o resto.',
  bolso: 'Bolso pro dinheiro que sobra depois das despesas — gasto livre do dia a dia.',
  meta: 'Objetivo pra guardar dinheiro ao longo do tempo.',
};

const TYPE_PLACEHOLDER: Record<BucketType, string> = {
  despesa: 'Nome (ex: internet, aluguel)',
  bolso: 'Nome (ex: namorada, lanches)',
  meta: 'Nome (ex: emergência, viagem)',
};

export default function AjustesScreen() {
  const { data: bucketRows } = useActiveBuckets();
  const buckets = (bucketRows ?? []).filter((b) => b.id !== UNALLOCATED_BUCKET_ID);

  const [name, setName] = useState('');
  const [type, setType] = useState<BucketType>('despesa');
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [dueDay, setDueDay] = useState('');
  const [isReserve, setIsReserve] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    // Map the single user-facing type back onto the (kind, fundingType) pair.
    const kind = type === 'meta' ? 'saving' : 'spending';
    const fundingType = type === 'despesa' ? 'fixed' : 'percentage';
    const parsedDue = Number.parseInt(dueDay, 10);
    await createBucket({
      name: name.trim(),
      color: colorForIndex(buckets.length),
      icon: suggestIcon(name),
      kind,
      fundingType,
      // despesa: monthly bill amount. meta (não-reserva): goal target. reserva: none.
      monthlyTargetCents:
        (type === 'despesa' || (type === 'meta' && !isReserve)) && valueCents != null ? valueCents : undefined,
      dueDay: type === 'despesa' && parsedDue >= 1 && parsedDue <= 31 ? parsedDue : undefined,
      isReserve: type === 'meta' && isReserve,
      sortOrder: buckets.length,
    });
    setName('');
    setValueCents(null);
    setDueDay('');
    setIsReserve(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton title="Ajustes" />
      <Text style={styles.title}>Despesas, bolsos e metas</Text>

      {(['despesa', 'bolso', 'meta'] as const).map((t) => {
        const items = buckets.filter((b) => bucketType(b) === t);
        if (items.length === 0) return null;
        return (
          <View key={t} style={styles.groupBlock}>
            <Text style={styles.groupLabel}>{GROUP_LABEL[t]}</Text>
            <View style={styles.chipWrap}>
              {items.map((bucket) => (
                <Chip key={bucket.id} label={bucket.name} color={bucket.color} icon={bucket.icon as never} />
              ))}
            </View>
          </View>
        );
      })}
      {buckets.length === 0 ? <Text style={styles.emptyText}>Nada criado ainda — crie o primeiro abaixo.</Text> : null}

      <Card style={styles.form}>
        <Text style={styles.formTitle}>Criar novo</Text>

        <View style={styles.segmented}>
          <SegmentButton label="Despesa" active={type === 'despesa'} onPress={() => setType('despesa')} />
          <SegmentButton label="Bolso" active={type === 'bolso'} onPress={() => setType('bolso')} />
          <SegmentButton label="Meta" active={type === 'meta'} onPress={() => setType('meta')} />
        </View>

        <Text style={styles.typeHint}>{TYPE_HINT[type]}</Text>

        <TextInput
          style={styles.input}
          placeholder={TYPE_PLACEHOLDER[type]}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        {type === 'despesa' ? (
          <>
            <MoneyInput placeholder="Valor mensal (ex: R$ 100,00)" valueCents={valueCents} onChangeCents={setValueCents} />
            <TextInput
              style={styles.input}
              placeholder="Dia do vencimento (ex: 10) — opcional"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={dueDay}
              onChangeText={setDueDay}
            />
          </>
        ) : null}

        {type === 'meta' ? (
          <>
            <Pressable style={styles.checkboxRow} onPress={() => setIsReserve((v) => !v)}>
              <View style={[styles.checkbox, isReserve && styles.checkboxOn]}>
                {isReserve ? <Ionicons name="checkmark" size={13} color={colors.textOnLight} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>É reserva (sem valor alvo, guarda pra sempre)</Text>
            </Pressable>
            {!isReserve ? (
              <MoneyInput placeholder="Valor alvo (ex: R$ 3.500,00)" valueCents={valueCents} onChangeCents={setValueCents} />
            ) : null}
          </>
        ) : null}

        <PrimaryButton label="Criar" onPress={handleCreate} disabled={!name.trim()} />
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
  groupBlock: { gap: spacing.sm },
  groupLabel: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13 },
  typeHint: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
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
