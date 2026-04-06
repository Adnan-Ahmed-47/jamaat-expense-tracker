/**
 * Enter the SMS code sent after "Send OTP" on the login screen.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import { verifyOTP } from '../services/authService';
import { colors } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const c = code.trim();
    if (!c) {
      Alert.alert(t('error'), t('otpEmpty'));
      return;
    }
    try {
      setBusy(true);
      await verifyOTP(c);
    } catch (e) {
      console.warn(e);
      if (nav.isFocused()) {
        Alert.alert(t('error'), t('otpInvalid'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LabeledInput label={t('otpCode')} value={code} onChangeText={setCode} keyboardType="number-pad" />
        <PrimaryButton title={t('verifyAndContinue')} onPress={submit} disabled={busy} />
        {busy ? <ActivityIndicator color={colors.primary} style={styles.spin} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  spin: { marginTop: 16 },
});
