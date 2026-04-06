import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTypography } from '../theme/TypographyProvider';

/** Text that applies Nastaleeq + RTL-friendly defaults when Urdu is selected */
export function AppText({ style, ...rest }: TextProps) {
  const { urduFont, textAlign, writingDirection } = useTypography();
  return (
    <Text
      {...rest}
      style={[
        urduFont ? { fontFamily: urduFont } : null,
        { textAlign, writingDirection },
        style,
      ]}
    />
  );
}
