import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { initDatabase } from './src/db/initDatabase';
import { initI18n } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TypographyProvider } from './src/theme/TypographyProvider';

void SplashScreen.setOptions({ fade: true, duration: 350 });

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [bgDecoded, setBgDecoded] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    const failSafe = setTimeout(() => setBgDecoded(true), 4000);
    return () => clearTimeout(failSafe);
  }, []);

  useEffect(() => {
    if (!bgDecoded) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [bgDecoded]);

  if (!i18nReady) {
    return (
      <ImageBackground
        source={require('./assets/splash-background.jpg')}
        style={styles.boot}
        resizeMode="cover"
        onLoadEnd={() => setBgDecoded(true)}
      >
        <StatusBar style="light" />
        <View style={styles.bootOverlay} />
        <View style={styles.bootContent}>
          <Text style={styles.bootTitle}>Tabligh Expenses</Text>
          <Text style={styles.bootSubtitle}>Jamaat contributions and fair shares</Text>
          <ActivityIndicator size="large" color="#fff" style={styles.bootSpinner} />
        </View>
      </ImageBackground>
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
  boot: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
  },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bootContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  bootTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bootSubtitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bootSpinner: { marginTop: 36 },
});
