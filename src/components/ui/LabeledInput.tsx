import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';
import { useTypography } from '../../theme/TypographyProvider';

type Props = TextInputProps & {
  label: string;
};

export function LabeledInput({ label, style, ...rest }: Props) {
  const { urduFont, textAlign, writingDirection } = useTypography();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, urduFont ? { fontFamily: urduFont } : null, { textAlign, writingDirection }]}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          urduFont ? { fontFamily: urduFont } : null,
          { textAlign, writingDirection },
          style,
        ]}
        {...rest}
      />
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
});
