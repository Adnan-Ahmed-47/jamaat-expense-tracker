/**
 * Sign in with email/password or phone OTP (requires reCAPTCHA modal for SMS).
 * Only shown when Firebase is configured (see RootNavigator).
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import { loginWithEmail, loginWithPhone } from '../services/authService';
import { getFirebaseOptionsForRecaptcha } from '../services/firebaseConfig';
import { colors } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const recaptchaRef = useRef<InstanceType<typeof FirebaseRecaptchaVerifierModal>>(null);

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const firebaseConfig = getFirebaseOptionsForRecaptcha();

  const submitEmail = async () => {
    try {
      const e = email.trim();
      if (!e || !password) {
        Alert.alert(t('error'), t('fillAllFields'));
        return;
      }
      setBusy(true);
      await loginWithEmail(e, password);
    } catch (err) {
      console.warn(err);
      if (nav.isFocused()) {
        Alert.alert(t('error'), t('loginFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const sendPhoneOtp = async () => {
    const p = phone.trim();
    if (!p) {
      Alert.alert(t('error'), t('phoneRequired'));
      return;
    }
    if (!recaptchaRef.current || !firebaseConfig) {
      Alert.alert(t('error'), t('firebaseNotConfigured'));
      return;
    }
    try {
      setBusy(true);
      await loginWithPhone(p, recaptchaRef.current);
      nav.navigate('OtpVerify');
    } catch (err) {
      console.warn(err);
      if (nav.isFocused()) {
        Alert.alert(t('error'), t('otpSendFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>{t('appName')}</Text>
        <Text style={styles.sub}>{t('loginSubtitle')}</Text>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setMode('email')}
            style={[styles.tab, mode === 'email' && styles.tabOn]}
          >
            <Text style={[styles.tabText, mode === 'email' && styles.tabTextOn]}>{t('emailTab')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('phone')}
            style={[styles.tab, mode === 'phone' && styles.tabOn]}
          >
            <Text style={[styles.tabText, mode === 'phone' && styles.tabTextOn]}>{t('phoneTab')}</Text>
          </Pressable>
        </View>

        {mode === 'email' ? (
          <>
            <LabeledInput
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <LabeledInput
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            <PrimaryButton title={t('login')} onPress={submitEmail} disabled={busy} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>{t('phoneE164Hint')}</Text>
            <LabeledInput
              label={t('phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            {firebaseConfig ? (
              <FirebaseRecaptchaVerifierModal
                ref={recaptchaRef}
                firebaseConfig={firebaseConfig}
                attemptInvisibleVerification
              />
            ) : null}
            <PrimaryButton title={t('sendOtp')} onPress={sendPhoneOtp} disabled={busy} />
          </>
        )}

        {busy ? <ActivityIndicator color={colors.primary} style={styles.spin} /> : null}

        <PrimaryButton title={t('goToSignup')} variant="outline" onPress={() => nav.navigate('Signup')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48 },
  brand: { fontSize: 26, fontWeight: '800', color: colors.primaryDark, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  tabs: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: '600', color: colors.text },
  tabTextOn: { color: '#fff' },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  spin: { marginVertical: 12 },
});
