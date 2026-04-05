import React, { useLayoutEffect, useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppCard } from '../components/ui/AppCard';
import {
  getExpensesByJamaat,
  getJamaatById,
  getMembersByJamaat,
  reconcileJamaatDateBounds,
} from '../db/repositories';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { Expense, Jamaat, Member } from '../types/models';
import { buildJamaatClosureReport } from '../utils/calculations';
import { formatINR } from '../utils/currency';

type Nav = NativeStackNavigationProp<RootStackParamList, 'JamaatCompleted'>;
type R = RouteProp<RootStackParamList, 'JamaatCompleted'>;

export function JamaatCompletedScreen() {
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
    nav.setOptions({ title: t('jamaatCompleted') });
  }, [nav, t]);

  const report = useMemo(() => {
    if (!jamaat) return null;
    return buildJamaatClosureReport(jamaat, members, expenses);
  }, [jamaat, members, expenses]);

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>…</Text>
      </SafeAreaView>
    );
  }

  const surplus = report.remainingInPool > 0.01;
  const deficit = report.remainingInPool < -0.01;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead}>{t('closureIntro')}</Text>

        <AppCard style={styles.summary}>
          <Text style={styles.summaryLine}>
            {t('totalMembers')}: {report.memberCount}
          </Text>
          <Text style={styles.summaryLine}>
            {t('totalContribution')}: {formatINR(report.totalContributions)}
          </Text>
          <Text style={styles.summaryLine}>
            {t('totalExpense')}: {formatINR(report.totalExpenses)}
          </Text>
          <Text style={[styles.summaryLine, styles.highlight]}>
            {t('remainingInPool')}: {formatINR(report.remainingInPool)}
          </Text>
        </AppCard>

        {surplus && (
          <AppCard style={styles.note}>
            <Text style={styles.noteTitle}>{t('surplusTitle')}</Text>
            <Text style={styles.noteBody}>{t('surplusExplain')}</Text>
          </AppCard>
        )}

        {deficit && (
          <AppCard style={styles.noteWarn}>
            <Text style={styles.noteTitle}>{t('deficitTitle')}</Text>
            <Text style={styles.noteBody}>{t('deficitExplain')}</Text>
          </AppCard>
        )}

        <Text style={styles.section}>{t('closurePerMember')}</Text>
        {report.members.map((m) => (
          <AppCard key={m.memberId} style={styles.memberCard}>
            <Text style={styles.name}>{m.name}</Text>
            <Text style={styles.row}>
              {t('contributionCol')}: {formatINR(m.contribution)}
            </Text>
            <Text style={styles.row}>
              {t('fairShare')}: {formatINR(m.fairShare)}
            </Text>
            <Text style={styles.row}>
              {t('netVsFairShare')}: {formatINR(m.netVsFairShare)}
            </Text>
            {surplus && m.surplusRefundShare > 0.01 && (
              <Text style={styles.rowStrong}>
                {t('surplusRefundLine', { amount: formatINR(m.surplusRefundShare) })}
              </Text>
            )}
            {deficit && m.deficitShare > 0.01 && (
              <Text style={styles.rowWarn}>
                {t('deficitShareLine', { amount: formatINR(m.deficitShare) })}
              </Text>
            )}
          </AppCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  lead: { fontSize: 14, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
  summary: { marginBottom: 16 },
  summaryLine: { fontSize: 16, color: colors.text, marginBottom: 8 },
  highlight: { fontWeight: '800', color: colors.primaryDark, fontSize: 17 },
  note: { marginBottom: 12, backgroundColor: '#E8F5E9' },
  noteWarn: { marginBottom: 12, backgroundColor: '#FFF3F3' },
  noteTitle: { fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  noteBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 8,
    marginBottom: 12,
  },
  memberCard: { marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '700', color: colors.primaryDark, marginBottom: 8 },
  row: { fontSize: 14, color: colors.text, marginBottom: 4 },
  rowStrong: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 6 },
  rowWarn: { fontSize: 14, fontWeight: '700', color: colors.error, marginTop: 6 },
  muted: { padding: 20, color: colors.textMuted },
});
