import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SPLASH_APP_TITLE = 'Tableegh Expense Manager';
const LOTTIE = require('../../assets/lottie/bismillah-lottiefiles.json');

type Props = {
  onDone: () => void;
};

const MIN_MS = 2800;
const MAX_MS = 7000;

export function SplashBoot({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const startedRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;

  /** Hide native splash immediately so this screen (not a second “card”) is what users see. */
  useLayoutEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  const scheduleDone = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const elapsed = Date.now() - startedRef.current;
    const wait = Math.max(0, MIN_MS - elapsed);
    setTimeout(onDone, wait);
  };

  useEffect(() => {
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) scheduleDone();
    });

    const maxTimer = setTimeout(() => {
      scheduleDone();
    }, MAX_MS);
    return () => {
      clearTimeout(maxTimer);
    };
  }, [onDone, titleOpacity, titleY]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style="light" />
      <View style={styles.centerWrap}>
        <LottieView
          source={LOTTIE}
          autoPlay
          loop={false}
          speed={1}
          resizeMode="contain"
          style={styles.lottie}
          onAnimationFinish={scheduleDone}
        />
      </View>

      <Animated.View style={[styles.footer, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
        <View style={styles.divider} />
        <Text style={styles.title}>{SPLASH_APP_TITLE}</Text>
        <Text style={styles.tagline}>Fair shares for jamaat travel</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B5E20',
    justifyContent: 'space-between',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    minHeight: 320,
  },
  lottie: {
    width: '100%',
    height: '100%',
    maxWidth: 420,
    maxHeight: 300,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
    zIndex: 2,
  },
  divider: {
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: 18,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tagline: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    letterSpacing: 0.25,
  },
});
