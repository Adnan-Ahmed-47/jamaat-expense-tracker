/**
 * Complete Firebase email/password reset in-app using oobCode from the reset email link.
 */
import * as Linking from 'expo-linking';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import type { AuthStackParamList } from '../navigation/types';
import { completePasswordResetWithOobCode } from '../services/authService';
import { colors } from '../theme/colors';
import { extractOobCodeFromResetInput } from '../utils/firebaseResetLink';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type R = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [linkOrCode, setLinkOrCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pre = route.params?.oobCode?.trim();
    if (pre) setLinkOrCode(pre);
  }, [route.params?.oobCode]);

  useEffect(() => {
    const applyUrl = (url: string | null) => {
      if (!url) return;
      const code = extractOobCodeFromResetInput(url);
      if (code) setLinkOrCode((prev) => prev || code);
    };
    void Linking.getInitialURL().then(applyUrl);
    const sub = Linking.addEventListener('url', ({ url }) => applyUrl(url));
    return () => sub.remove();
  }, []);

  const submit = async () => {
    const code = extractOobCodeFromResetInput(linkOrCode);
    if (!code) {
      Alert.alert(t('error'), t('resetPasswordInvalidCode'));
      return;
    }
    if (pw.length < 6) {
      Alert.alert(t('error'), t('passwordTooShort'));
      return;
    }
    if (pw !== pw2) {
      Alert.alert(t('error'), t('passwordsDoNotMatch'));
      return;
    }
    try {
      setBusy(true);
      await completePasswordResetWithOobCode(code, pw);
      Alert.alert(t('passwordUpdatedTitle'), t('passwordUpdated'), [
        { text: t('ok'), onPress: () => nav.navigate('Login') },
      ]);
    } catch (e: unknown) {
      console.warn(e);
      Alert.alert(t('error'), t('resetPasswordInvalidCode'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>{t('resetPasswordScreenHint')}</Text>
        <LabeledInput
          label={t('resetLinkOrCode')}
          value={linkOrCode}
          onChangeText={setLinkOrCode}
          autoCapitalize="none"
          multiline
          numberOfLines={3}
        />
        <LabeledInput
          label={t('password')}
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          passwordToggle
          autoComplete="password-new"
        />
        <LabeledInput
          label={t('confirmNewPassword')}
          value={pw2}
          onChangeText={setPw2}
          secureTextEntry
          passwordToggle
          autoComplete="password-new"
        />
        <PrimaryButton title={t('save')} onPress={submit} disabled={busy} />
        {busy ? <ActivityIndicator color={colors.primary} style={styles.spin} /> : null}
        <View style={{ height: 12 }} />
        <PrimaryButton title={t('backToLogin')} variant="outline" onPress={() => nav.navigate('Login')} />
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
