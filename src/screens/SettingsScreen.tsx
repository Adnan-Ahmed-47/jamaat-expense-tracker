import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { AppCard } from '../components/ui/AppCard';
import type { AppLanguage } from '../i18n';
import { setAppLanguage } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { pickAndParseBackup, restoreBackup, shareBackupJson } from '../services/backupService';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'hi', label: 'हिन्दी' },
];

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const nav = useNavigation<Nav>();
  const db = useSQLiteContext();

  const changeLang = async (code: AppLanguage) => {
    await setAppLanguage(code);
  };

  const backup = async () => {
    try {
      await shareBackupJson(db);
      Alert.alert('', t('backupSuccess'));
    } catch {
      Alert.alert(t('error'), t('error'));
    }
  };

  const restore = () => {
    Alert.alert(t('restore'), t('restoreConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('restore'),
        style: 'destructive',
        onPress: async () => {
          try {
            const payload = await pickAndParseBackup();
            if (!payload) return;
            await restoreBackup(db, payload);
            Alert.alert('', t('restoreSuccess'));
            nav.navigate('Home');
          } catch {
            Alert.alert(t('error'), t('error'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>{t('language')}</Text>
        <AppCard>
          {LANGS.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => changeLang(l.code)}
              style={[styles.langRow, i18n.language === l.code && styles.langOn]}
            >
              <Text style={[styles.langText, i18n.language === l.code && styles.langTextOn]}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </AppCard>

        <Text style={styles.section}>{t('cloudSyncSection')}</Text>
        <AppCard>
          <Text style={styles.cloudBody}>{t('cloudSyncSettingsBody')}</Text>
          <Text style={styles.cloudStatus}>
            {isFirebaseConfigured() ? t('cloudSyncStatusOn') : t('cloudSyncStatusOff')}
          </Text>
        </AppCard>

        <Text style={styles.section}>{t('backup')}</Text>
        <PrimaryButton title={t('backup')} onPress={backup} />
        <PrimaryButton title={t('restore')} variant="outline" onPress={restore} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
    marginTop: 8,
  },
  langRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  langOn: { backgroundColor: colors.primary },
  langText: { fontSize: 16, color: colors.text },
  langTextOn: { color: '#fff', fontWeight: '700' },
  cloudBody: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 12 },
  cloudStatus: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
});
