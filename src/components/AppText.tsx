import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  StyleSheet,
  TextStyle,
} from 'react-native';

const weightToFamily: Record<string, string> = {
  '100': 'DMSans_400Regular',
  '200': 'DMSans_400Regular',
  '300': 'DMSans_400Regular',
  '400': 'DMSans_400Regular',
  normal: 'DMSans_400Regular',
  '500': 'DMSans_500Medium',
  '600': 'DMSans_600SemiBold',
  '700': 'DMSans_700Bold',
  bold: 'DMSans_700Bold',
  '800': 'DMSans_700Bold',
  '900': 'DMSans_700Bold',
};

function applyFont(style: TextStyle | null | undefined): TextStyle {
  const flat: TextStyle = (StyleSheet.flatten(style) as TextStyle) ?? {};
  if (flat.fontFamily) return flat;
  const { fontWeight, ...rest } = flat;
  return {
    ...rest,
    fontFamily: weightToFamily[fontWeight ?? '400'] ?? 'DMSans_400Regular',
  };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={applyFont(style as TextStyle)} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={applyFont(style as TextStyle)} />;
}
