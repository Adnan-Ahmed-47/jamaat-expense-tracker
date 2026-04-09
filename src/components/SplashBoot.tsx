import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/** Green backdrop matching Bismillah / Islamic theme; replace JSON with your LottieFiles export if desired. */
const LOTTIE = require('../../assets/lottie/bismillah.json');

type Props = {
  onDone: () => void;
};

const MIN_MS = 1800;
const MAX_MS = 5000;

export function SplashBoot({ onDone }: Props) {
  const [started] = useState(() => Date.now());
  const [lottieReady, setLottieReady] = useState(false);

  const finish = () => {
    const elapsed = Date.now() - started;
    const wait = Math.max(0, MIN_MS - elapsed);
    setTimeout(onDone, wait);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (!lottieReady) onDone();
    }, MAX_MS);
    return () => clearTimeout(t);
  }, [lottieReady, onDone]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LottieView
        source={LOTTIE}
        style={styles.lottie}
        autoPlay
        loop={false}
        onAnimationFinish={finish}
        onLayout={() => setLottieReady(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});
