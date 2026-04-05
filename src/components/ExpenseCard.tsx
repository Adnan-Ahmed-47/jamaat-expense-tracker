import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard } from './ui/AppCard';
import { colors } from '../theme/colors';
import type { Expense } from '../types/models';
import { formatINR } from '../utils/currency';

type Props = {
  expense: Expense;
  payerName: string;
  onPress: () => void;
};

export function ExpenseCard({ expense, payerName, onPress }: Props) {
  const { t, i18n } = useTranslation();

  const catKey =
    expense.category === 'Food' ? 'food' : expense.category === 'Travel' ? 'travel' : 'misc';

  const fmt = new Date(
    parseInt(expense.expenseDate.slice(0, 4), 10),
    parseInt(expense.expenseDate.slice(5, 7), 10) - 1,
    parseInt(expense.expenseDate.slice(8, 10), 10)
  ).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.title}>{expense.title}</Text>
          <Text style={styles.amount}>{formatINR(expense.amount)}</Text>
        </View>
        <Text style={styles.meta}>
          {fmt} · {t(catKey)} · {t('paidBy')}: {payerName}
        </Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  amount: { fontSize: 16, fontWeight: '700', color: colors.primary },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
});
