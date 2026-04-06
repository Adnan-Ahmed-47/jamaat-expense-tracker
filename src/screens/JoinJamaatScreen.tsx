/**
 * Join a shared Jamaat using an invite code (JAM-XXXXXX). Requires sign-in when Firebase is enabled.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerField } from '../components/DatePickerField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import type { RootStackParamList } from '../navigation/types';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { joinJamaatByCode } from '../services/jamaatService';
import { colors } from '../theme/colors';
import { toYMD } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'JoinJamaat'>;

export function JoinJamaatScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const db = useSQLiteContext();

  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinContribution, setJoinContribution] = useState('');
  const [joinDate, setJoinDate] = useState(toYMD(new Date()));
  const [joinBusy, setJoinBusy] = useState(false);

  const firebaseOn = isFirebaseConfigured();

  const submitJoin = async () => {
    const code = joinCode.trim();
    const display = joinName.trim();
    if (!code) {
      Alert.alert(t('error'), t('inviteCode'));
      return;
    }
    if (!display) {
      Alert.alert(t('error'), t('yourName'));
      return;
    }
    const c = parseFloat(joinContribution.replace(/,/g, '')) || 0;
    setJoinBusy(true);
    try {
      const res = await joinJamaatByCode(db, code, display, c, joinDate);
      if (res.error === 'invalid') {
        Alert.alert(t('error'), t('invalidCode'));
        return;
      }
      if (res.error === 'firebase') {
        Alert.alert(t('error'), t('firebaseNotConfigured'));
        return;
      }
      if (res.error === 'auth') {
        Alert.alert(t('error'), t('signInRequired'));
        return;
      }
      if (res.error === 'network') {
        Alert.alert(t('error'), t('networkError'));
        return;
      }
      if (res.localJamaatId <= 0) {
        Alert.alert(t('error'), t('networkError'));
        return;
      }
      nav.replace('JamaatDetail', { jamaatId: res.localJamaatId });
    } finally {
      setJoinBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('joinJamaat')}</Text>
        {!firebaseOn ? <Text style={styles.note}>{t('cloudSyncJoinHint')}</Text> : null}

        <LabeledInput
          label={t('inviteCode')}
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
        />
        <LabeledInput label={t('yourName')} value={joinName} onChangeText={setJoinName} />
        <LabeledInput
          label={t('contribution')}
          value={joinContribution}
          onChangeText={setJoinContribution}
          keyboardType="decimal-pad"
        />
        <DatePickerField label={t('joinDate')} valueYmd={joinDate} onChangeYmd={setJoinDate} />

        <View style={styles.row}>
          <PrimaryButton title={t('cancel')} variant="outline" onPress={() => nav.goBack()} disabled={joinBusy} />
          <PrimaryButton title={t('join')} onPress={submitJoin} disabled={joinBusy} />
        </View>
        {joinBusy ? <ActivityIndicator color={colors.primary} style={styles.spin} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryDark, marginBottom: 12 },
  note: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  spin: { marginTop: 16 },
});
