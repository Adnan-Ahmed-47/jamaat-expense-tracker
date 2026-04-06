/**
 * Loads Noto Nastaliq Urdu and exposes font + RTL-friendly styles when language is Urdu.
 */
import { NotoNastaliqUrdu_400Regular, useFonts } from '@expo-google-fonts/noto-nastaliq-urdu';
import React, { createContext, useContext, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from './colors';

type Typo = {
  /** Font family for Text/TextInput when Urdu is active; undefined keeps system default */
  urduFont?: string;
  isUrdu: boolean;
  /** Prefer right-aligned text in Urdu */
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
};

const TypoCtx = createContext<Typo | undefined>(undefined);

export function TypographyProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [loaded] = useFonts({ NotoNastaliqUrdu_400Regular });

  const isUrdu = i18n.language === 'ur';
  const value = useMemo<Typo>(() => {
    return {
      urduFont: isUrdu ? 'NotoNastaliqUrdu_400Regular' : undefined,
      isUrdu,
      textAlign: isUrdu ? 'right' : 'left',
      writingDirection: isUrdu ? 'rtl' : 'ltr',
    };
  }, [isUrdu]);

  if (!loaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <TypoCtx.Provider value={value}>
      <View style={[styles.flex, isUrdu && styles.rtlRoot]}>{children}</View>
    </TypoCtx.Provider>
  );
}

export function useTypography(): Typo {
  const v = useContext(TypoCtx);
  if (!v) {
    return {
      urduFont: undefined,
      isUrdu: false,
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
