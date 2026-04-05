import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import type { ExpenseCategory } from '../types/models';
import { formatINR } from '../utils/currency';

const chartW = Dimensions.get('window').width - 48;

type Props = {
  byCategory: Record<ExpenseCategory, number>;
};

export function ExpensePieChart({ byCategory }: Props) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const entries: { name: string; amount: number; color: string; legendFontColor: string }[] = [];
    if (byCategory.Food > 0) {
      entries.push({
        name: t('food'),
        amount: byCategory.Food,
        color: colors.chartFood,
        legendFontColor: colors.text,
      });
    }
    if (byCategory.Travel > 0) {
      entries.push({
        name: t('travel'),
        amount: byCategory.Travel,
        color: colors.chartTravel,
        legendFontColor: colors.text,
      });
    }
    if (byCategory.Misc > 0) {
      entries.push({
        name: t('misc'),
        amount: byCategory.Misc,
        color: colors.chartMisc,
        legendFontColor: colors.text,
      });
    }
    return entries.map((e) => ({
      name: e.name,
      population: e.amount,
      color: e.color,
      legendFontColor: e.legendFontColor,
    }));
  }, [byCategory, t]);

  const total = byCategory.Food + byCategory.Travel + byCategory.Misc;

  if (total <= 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('expenseBreakdown')}</Text>
      <PieChart
        data={data}
        width={chartW}
        height={200}
        chartConfig={{
          color: () => colors.primary,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="0"
        absolute
        hasLegend
      />
      <Text style={styles.total}>
        {t('totalExpense')}: {formatINR(total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 12, alignItems: 'center' },
  title: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  total: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
});
