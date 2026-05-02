/**
 * Sign up with email and password; optional display name stored in Firebase profile + Firestore user doc.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import { signupWithEmail } from '../services/authService';
import { colors } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export function SignupScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const em = email.trim();
    if (!em || !password) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordTooShort'));
      return;
    }
    try {
      setBusy(true);
      await signupWithEmail(em, password, name.trim() || undefined);
      nav.pop();
    } catch (e: unknown) {
      console.warn(e);
      if (!nav.isFocused()) return;
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
      if (code === 'auth/email-already-in-use') {
        Alert.alert(t('error'), t('signupEmailInUse'));
      } else {
        Alert.alert(t('error'), t('signupFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LabeledInput
          label={t('displayNameOptional')}
          value={name}
          onChangeText={setName}
          placeholder={t('placeholderDisplayName')}
        />
        <LabeledInput
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('placeholderEmail')}
        />
        <LabeledInput
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          passwordToggle
          placeholder={t('placeholderPassword')}
        />
        <PrimaryButton title={t('signup')} onPress={submit} disabled={busy} />
        {busy ? <ActivityIndicator color={colors.primary} style={styles.spin} /> : null}
        <PrimaryButton
          title={t('backToLogin')}
          variant="outline"
          onPress={() => nav.pop()}
          style={styles.backToLoginBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  spin: { marginTop: 16 },
  backToLoginBtn: { marginTop: 16 },
});
