import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { SplashBoot } from './src/components/SplashBoot';
import { AuthProvider } from './src/context/AuthContext';
import { initDatabase } from './src/db/initDatabase';
import { initI18n } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TypographyProvider } from './src/theme/TypographyProvider';
void SplashScreen.setOptions({ fade: true, duration: 350 });

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    void initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if (!splashDone || !i18nReady) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [splashDone, i18nReady]);

  if (!splashDone) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
        <View style={styles.boot}>
          <SplashBoot onDone={() => setSplashDone(true)} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!i18nReady) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
        <View style={styles.bootLoading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
      <AuthProvider>
        <TypographyProvider>
          <SQLiteProvider databaseName="jamaat.db" onInit={initDatabase}>
            <RootNavigator />
            <StatusBar style="light" />
          </SQLiteProvider>
        </TypographyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1 },
  bootLoading: {
    flex: 1,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
