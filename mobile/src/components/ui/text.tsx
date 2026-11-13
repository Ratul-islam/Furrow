import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number' | 'overline';
type Tone = 'primary' | 'secondary' | 'muted' | 'brand' | 'demo' | 'inverse';

export type AppTextProps = TextProps & { variant?: Variant; tone?: Tone; weight?: '400' | '500' | '600' | '700' | '800' };

export function Text({ variant = 'body', tone = 'primary', weight, style, ...rest }: AppTextProps) {
  const t = useTheme();
  const color = {
    primary: t.text,
    secondary: t.textSecondary,
    muted: t.textMuted,
    brand: t.brandInk,
    demo: t.demo,
    inverse: t.card,
  }[tone];
  return (
    <RNText
      {...rest}
      style={[styles.base, styles[variant], { color }, weight ? { fontWeight: weight } : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontFamily: Fonts?.sans },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 16, lineHeight: 21, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18 },
  number: { fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
