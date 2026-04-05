import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard } from './ui/AppCard';
import { colors } from '../theme/colors';
import type { Member } from '../types/models';
import { formatINR } from '../utils/currency';
import { memberPersonDays } from '../utils/dateUtils';

type Props = {
  member: Member;
  jamaatStart: string;
  jamaatEnd: string;
  onPress: () => void;
};

export function MemberCard({ member, jamaatStart, jamaatEnd, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const days = memberPersonDays(jamaatStart, jamaatEnd, member.joinDate, member.leaveDate);

  const fmt = (ymd: string) =>
    new Date(
      parseInt(ymd.slice(0, 4), 10),
      parseInt(ymd.slice(5, 7), 10) - 1,
      parseInt(ymd.slice(8, 10), 10)
    ).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.line}>
          {t('contribution')}: {formatINR(member.contribution)}
        </Text>
        <Text style={styles.line}>
          {fmt(member.joinDate)}
          {member.leaveDate ? ` → ${fmt(member.leaveDate)}` : ''}
        </Text>
        <Text style={styles.days}>{t('daysPresent', { count: days })}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  line: { fontSize: 14, color: colors.text, marginBottom: 4 },
  days: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 4 },
});
