import { getHeaderTitle, Header } from '@react-navigation/elements';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

/**
 * JS header from @react-navigation/elements applies status-bar inset via headerStatusBarHeight.
 * Native-stack's default Android header often mis-measures under edge-to-edge; this avoids that.
 */
export function SafeAreaStackHeader({ route, options, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title = getHeaderTitle(options, route.name);

  const statusBarPad = React.useMemo(() => {
    const legacy = StatusBar.currentHeight ?? 0;
    if (Platform.OS === 'ios') {
      return Math.max(insets.top, 20);
    }
    // Android: safe-area top is sometimes 0 before layout; StatusBar.currentHeight can lag under edge-to-edge.
    return Math.max(insets.top, legacy, 24);
  }, [insets.top]);

  const headerStyle = React.useMemo(
    () => [{ backgroundColor: colors.primaryDark }, options.headerStyle],
    [options.headerStyle]
  );

  const headerTitleStyle = React.useMemo(
    () => [{ fontWeight: '700' as const, color: '#fff' }, options.headerTitleStyle],
    [options.headerTitleStyle]
  );

  return (
    <Header
      title={title}
      back={back}
      headerTintColor={options.headerTintColor ?? '#fff'}
      headerStyle={headerStyle}
      headerTitleStyle={headerTitleStyle}
      headerTitleAlign={options.headerTitleAlign ?? (Platform.OS === 'android' ? 'left' : 'center')}
      headerShadowVisible={options.headerShadowVisible ?? true}
      headerBackButtonDisplayMode={options.headerBackButtonDisplayMode ?? 'minimal'}
      headerLeft={options.headerLeft}
      headerRight={options.headerRight}
      headerTitle={options.headerTitle}
      headerStatusBarHeight={statusBarPad}
    />
  );
}
