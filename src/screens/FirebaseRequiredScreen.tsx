/**
 * Shown when Firebase client keys are missing from app.json.
 * The app does not run until keys are added (see FIREBASE_SETUP.txt).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export function FirebaseRequiredScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('firebaseRequiredTitle')}</Text>
        <Text style={styles.body}>{t('firebaseRequiredBody')}</Text>
        <View style={styles.box}>
          <Text style={styles.stepsTitle}>{t('firebaseRequiredStepsTitle')}</Text>
          <Text style={styles.steps}>{t('firebaseRequiredSteps')}</Text>
        </View>
        <Text style={styles.footer}>{t('firebaseRequiredFooter')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 20 },
  box: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginBottom: 8 },
  steps: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  footer: { fontSize: 13, color: colors.textMuted, lineHeight: 20, fontStyle: 'italic' },
});
