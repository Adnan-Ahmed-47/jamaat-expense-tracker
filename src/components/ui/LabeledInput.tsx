import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';
import { useTypography } from '../../theme/TypographyProvider';

type Props = TextInputProps & {
  label: string;
  /** Renders a show/hide control for password fields. */
  passwordToggle?: boolean;
};

export function LabeledInput({ label, passwordToggle, style, secureTextEntry, ...rest }: Props) {
  const { t } = useTranslation();
  const { urduFont, textAlign, writingDirection } = useTypography();
  const [showPlain, setShowPlain] = useState(false);
  const effectiveSecure = passwordToggle ? !showPlain : secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, urduFont ? { fontFamily: urduFont } : null, { textAlign, writingDirection }]}>
        {label}
      </Text>
      {passwordToggle ? (
        <View style={styles.passwordRow}>
          <TextInput
            placeholderTextColor={colors.textMuted}
            style={[
              styles.inputPlain,
              urduFont ? { fontFamily: urduFont } : null,
              { textAlign, writingDirection },
              style,
            ]}
            secureTextEntry={effectiveSecure}
            {...rest}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPlain ? t('hidePassword') : t('showPassword')}
            onPress={() => setShowPlain((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            <Ionicons
              name={showPlain ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        </View>
      ) : (
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            urduFont ? { fontFamily: urduFont } : null,
            { textAlign, writingDirection },
            style,
          ]}
          secureTextEntry={secureTextEntry}
          {...rest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingRight: 4,
  },
  inputPlain: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 0,
  },
  eyeBtn: { padding: 10 },
});
