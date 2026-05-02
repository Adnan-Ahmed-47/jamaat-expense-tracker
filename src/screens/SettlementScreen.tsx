import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { AppCard } from '../components/ui/AppCard';
import {
  getExpensesByJamaat,
  getJamaatById,
  getMembersByJamaat,
  reconcileJamaatDateBounds,
} from '../db/repositories';
import type { RootStackParamList } from '../navigation/types';
import { shareSettlementPdf } from '../services/pdfReport';
import { colors } from '../theme/colors';
import type { Expense, Jamaat, Member } from '../types/models';
import { buildJamaatSettlement } from '../utils/calculations';
import { formatINR } from '../utils/currency';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settlement'>;
type R = RouteProp<RootStackParamList, 'Settlement'>;

export function SettlementScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { jamaatId } = route.params;
  const db = useSQLiteContext();

  const [jamaat, setJamaat] = useState<Jamaat | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = useCallback(async () => {
    await reconcileJamaatDateBounds(db, jamaatId);
    setJamaat(await getJamaatById(db, jamaatId));
    setMembers(await getMembersByJamaat(db, jamaatId));
    setExpenses(await getExpensesByJamaat(db, jamaatId));
  }, [db, jamaatId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    nav.setOptions({ title: t('settlement') });
  }, [nav, t]);

  const summary = useMemo(() => {
    if (!jamaat) return null;
    return buildJamaatSettlement(jamaat, members, expenses);
  }, [jamaat, members, expenses]);

  const pdfLabels = useMemo(
    () => ({
      totalExpense: t('totalExpense'),
      totalContribution: t('totalContribution'),
      perDayExpense: t('perDayExpense'),
      poolSurplus: t('poolSurplus'),
      members: t('members'),
      poolSettlement: t('poolSettlement'),
      noPoolMoves: t('noPoolMoves'),
      to_receive: t('toReceive'),
      to_pay: t('toPay'),
      settled: t('settled'),
      contributionCol: t('contributionCol'),
      paidFromPoolCol: t('paidFromPoolCol'),
      receiveFromHolderPlain: t('receiveFromHolderPlain'),
      payToHolderPlain: t('payToHolderPlain'),
    }),
    [t]
  );

  const exportPdf = async () => {
    if (!summary) return;
    try {
      await shareSettlementPdf(summary, pdfLabels);
    } catch {
      Alert.alert(t('error'), t('error'));
    }
  };

  if (!summary) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>…</Text>
      </SafeAreaView>
    );
  }

  const statusLabel = (s: string) =>
    s === 'to_receive' ? t('toReceive') : s === 'to_pay' ? t('toPay') : t('settled');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppCard style={styles.card}>
          <Text style={styles.hint}>{t('poolModelHint')}</Text>
          <Text style={styles.big}>{t('totalExpense')}</Text>
          <Text style={styles.bigVal}>{formatINR(summary.totalExpenses)}</Text>
          <Text style={styles.line}>
            {t('totalContribution')}: {formatINR(summary.totalContributions)}
          </Text>
          <Text style={styles.line}>
            {t('perDayExpense')}: {formatINR(summary.perDayExpense)}
          </Text>
          <Text style={styles.line}>
            {t('poolSurplus')}: {formatINR(summary.poolSurplus)}
          </Text>
          <Text style={styles.lineMuted}>
            {t('personDays')} (group): {summary.totalPersonDays} · {t('jamaatDaysLabel')}:{' '}
            {summary.totalJamaatDays}
          </Text>
        </AppCard>

        <ExpensePieChart byCategory={summary.expenseByCategory} />

        <Text style={styles.section}>{t('members')}</Text>
        {summary.members.map((m) => (
          <AppCard key={m.memberId} style={styles.memberCard}>
            <Text style={styles.memberName}>{m.name}</Text>
            <Text style={styles.small}>
              {t('personDays')}: {m.personDays} · {t('fairShare')}: {formatINR(m.fairShare)}
            </Text>
            <Text style={styles.small}>
              {t('contributionCol')}: {formatINR(m.contribution)}
            </Text>
            <Text style={styles.smallMuted}>
              {t('paidFromPoolCol')}: {formatINR(m.expensesPaid)}
            </Text>
            <Text
              style={[
                styles.balance,
                m.status === 'to_receive' && styles.recv,
                m.status === 'to_pay' && styles.pay,
              ]}
            >
              {t('balance')}: {formatINR(m.balance)} ({statusLabel(m.status)})
            </Text>
          </AppCard>
        ))}

        <Text style={styles.section}>{t('poolSettlement')}</Text>
        <Text style={styles.subHint}>{t('poolSettlementHint')}</Text>
        {summary.poolInstructions.length === 0 ? (
          <Text style={styles.empty}>{t('noPoolMoves')}</Text>
        ) : (
          summary.poolInstructions.map((p) => (
            <AppCard key={`${p.memberId}-${p.direction}`} style={styles.transferCard}>
              <Text style={styles.transferText}>
                {p.direction === 'receive_from_holder'
                  ? t('receiveFromHolder', { name: p.name, amount: formatINR(p.amount) })
                  : t('payToHolder', { name: p.name, amount: formatINR(p.amount) })}
              </Text>
            </AppCard>
          ))
        )}

        {/* Export PDF Button - Disabled for now  */}
        {/* <PrimaryButton title={t('exportPdf')} onPress={exportPdf} /> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 48 },
  card: { marginBottom: 8 },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  big: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  bigVal: { fontSize: 28, fontWeight: '800', color: colors.primaryDark, marginBottom: 12 },
  line: { fontSize: 15, color: colors.text, marginBottom: 6 },
  lineMuted: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 20,
    marginBottom: 10,
  },
  subHint: { fontSize: 13, color: colors.textMuted, marginBottom: 10, lineHeight: 18 },
  memberCard: { marginBottom: 10 },
  memberName: { fontSize: 17, fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  small: { fontSize: 14, color: colors.text, marginBottom: 4 },
  smallMuted: { fontSize: 13, color: colors.textMuted, marginBottom: 4, fontStyle: 'italic' },
  balance: { fontSize: 15, fontWeight: '700', marginTop: 6, color: colors.text },
  recv: { color: colors.primary },
  pay: { color: colors.error },
  empty: { color: colors.textMuted, marginBottom: 16 },
  transferCard: { marginBottom: 10, backgroundColor: '#E8F5E9' },
  transferText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark, lineHeight: 22 },
  muted: { padding: 20, color: colors.textMuted },
});
