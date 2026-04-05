import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { JamaatDetailScreen } from '../screens/JamaatDetailScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { SettlementScreen } from '../screens/SettlementScreen';
import { JamaatCompletedScreen } from '../screens/JamaatCompletedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';
import { SafeNativeStackHeader } from './SafeNativeStackHeader';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  const { t } = useTranslation();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          header: (props) => <SafeNativeStackHeader {...props} />,
          headerStyle: { backgroundColor: colors.primaryDark },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', color: '#fff' },
          headerShadowVisible: true,
          contentStyle: { backgroundColor: colors.background },
          ...(Platform.OS === 'android'
            ? {
                statusBarTranslucent: true,
                statusBarStyle: 'light' as const,
                navigationBarColor: colors.primaryDark,
              }
            : {}),
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
        <Stack.Screen name="JamaatDetail" component={JamaatDetailScreen} />
        <Stack.Screen name="Members" component={MembersScreen} />
        <Stack.Screen name="Expenses" component={ExpensesScreen} />
        <Stack.Screen name="Settlement" component={SettlementScreen} />
        <Stack.Screen name="JamaatCompleted" component={JamaatCompletedScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
