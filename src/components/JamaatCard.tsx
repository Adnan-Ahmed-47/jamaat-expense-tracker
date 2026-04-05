import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard } from './ui/AppCard';
import { colors } from '../theme/colors';
import type { Jamaat } from '../types/models';

type Props = {
  jamaat: Jamaat;
  onPress: () => void;
};

export function JamaatCard({ jamaat, onPress }: Props) {
  const { i18n } = useTranslation();
  const fmt = (ymd: string) =>
    parseYMDSafe(ymd).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <Text style={styles.name}>{jamaat.name}</Text>
        <View style={styles.row}>
          <Text style={styles.meta}>{fmt(jamaat.startDate)}</Text>
          <Text style={styles.dash}> — </Text>
          <Text style={styles.meta}>{fmt(jamaat.endDate)}</Text>
        </View>
      </AppCard>
    </Pressable>
  );
}

function parseYMDSafe(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  meta: { fontSize: 14, color: colors.textMuted },
  dash: { color: colors.textMuted },
});
