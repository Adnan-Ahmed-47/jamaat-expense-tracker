/**
 * Request a Firebase password-reset email (same project as app.json Firebase keys).
 */
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import { sendPasswordResetToEmail } from '../services/authService';
import { colors } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type Route = RouteProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [email, setEmail] = useState(params?.email?.trim() ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const em = email.trim();
    if (!em) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    try {
      setBusy(true);
      await sendPasswordResetToEmail(em);
      Alert.alert(t('forgotPasswordSentTitle'), t('forgotPasswordSent'), [
        { text: t('ok'), onPress: () => nav.goBack() },
      ]);
    } catch (e: unknown) {
      console.warn(e);
      const code =
        typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
      if (code === 'auth/invalid-email') {
        Alert.alert(t('error'), t('loginFailed'));
      } else if (code === 'auth/network-request-failed') {
        Alert.alert(t('error'), t('networkError'));
      } else if (code === 'auth/too-many-requests') {
        Alert.alert(t('error'), t('tooManyRequests'));
      } else if (!code) {
        Alert.alert(t('error'), t('forgotPasswordFailed'));
      } else {
        Alert.alert(t('forgotPasswordSentTitle'), t('forgotPasswordSent'), [
          { text: t('ok'), onPress: () => nav.goBack() },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>{t('forgotPasswordHint')}</Text>
        <LabeledInput
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <PrimaryButton title={t('sendResetLink')} onPress={submit} disabled={busy} />
        {busy ? <ActivityIndicator color={colors.primary} style={styles.spin} /> : null}
        <View style={{ height: 12 }} />
        <PrimaryButton title={t('backToLogin')} variant="outline" onPress={() => nav.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  body: { fontSize: 14, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
  spin: { marginTop: 16 },
});
