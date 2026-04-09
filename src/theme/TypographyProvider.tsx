/**
 * Loads Noto Nastaliq (Urdu) + Noto Sans Arabic and RTL layout for Urdu / Arabic.
 */
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic';
import { NotoNastaliqUrdu_400Regular, useFonts } from '@expo-google-fonts/noto-nastaliq-urdu';
import React, { createContext, useContext, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from './colors';

type Typo = {
  /** @deprecated use scriptFont */
  urduFont?: string;
  /** Font for Urdu or Arabic script UI */
  scriptFont?: string;
  isUrdu: boolean;
  isArabic: boolean;
  isRtl: boolean;
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
};

const TypoCtx = createContext<Typo | undefined>(undefined);

export function TypographyProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [loaded] = useFonts({
    NotoNastaliqUrdu_400Regular,
    NotoSansArabic_400Regular,
  });

  const isUrdu = i18n.language === 'ur';
  const isArabic = i18n.language === 'ar';
  const isRtl = isUrdu || isArabic;
  const value = useMemo<Typo>(() => {
    const scriptFont = isUrdu
      ? 'NotoNastaliqUrdu_400Regular'
      : isArabic
        ? 'NotoSansArabic_400Regular'
        : undefined;
    return {
      scriptFont,
      urduFont: scriptFont,
      isUrdu,
      isArabic,
      isRtl,
      textAlign: isRtl ? 'right' : 'left',
      writingDirection: isRtl ? 'rtl' : 'ltr',
    };
  }, [isUrdu, isArabic, isRtl]);

  if (!loaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <TypoCtx.Provider value={value}>
      <View style={[styles.flex, isRtl && styles.rtlRoot]}>{children}</View>
    </TypoCtx.Provider>
  );
}

export function useTypography(): Typo {
  const v = useContext(TypoCtx);
  if (!v) {
    return {
      urduFont: undefined,
      scriptFont: undefined,
      isUrdu: false,
      isArabic: false,
      isRtl: false,
      textAlign: 'left',
      writingDirection: 'ltr',
    };
  }
  return v;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  rtlRoot: { direction: 'rtl' },
});
