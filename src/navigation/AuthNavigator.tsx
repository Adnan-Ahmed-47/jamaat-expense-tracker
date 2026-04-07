import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { OtpVerifyScreen } from '../screens/OtpVerifyScreen';
import { colors } from '../theme/colors';
import type { AuthStackParamList } from './types';
import { SafeNativeStackHeader } from './SafeNativeStackHeader';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        header: (props) => <SafeNativeStackHeader {...props} />,
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('loginTitle'), headerShown: false }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: t('signupTitle') }} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: t('otpTitle') }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: t('forgotPasswordTitle') }} />
    </Stack.Navigator>
  );
}
