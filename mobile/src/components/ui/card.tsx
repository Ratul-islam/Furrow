import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_OUT_CSS } from '@/lib/motion';

import { Icon } from './icon';
import { Text } from './text';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'brand' | 'muted';
};

export function Card({ children, style, padded = true, onPress, tone = 'default' }: CardProps) {
  const t = useTheme();
  const bg = tone === 'brand' ? t.brandSoft : tone === 'muted' ? t.cardMuted : t.card;
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: tone === 'brand' ? 'transparent' : t.border },
        padded && styles.padded,
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return <PressScale onPress={onPress}>{body}</PressScale>;
}

/** Press feedback for anything tappable: scale to 0.97 on press-in, 120ms. */
export function PressScale({ onPress, children, accessibilityLabel }: { onPress: () => void; children: ReactNode; accessibilityLabel?: string }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[styles.press, pressed && styles.pressed]}>{children}</Animated.View>
    </Pressable>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
  overline,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  overline?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 2 }}>
        {overline ? (
          <Text variant="overline" tone="muted">
            {overline}
          </Text>
        ) : null}
        <Text variant="heading">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Where the numbers come from: a small "Source" chip that opens on tap, so it never crowds the picture. */
export function SourceNote({ children }: { children: ReactNode }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.source} hitSlop={6}>
      <View style={[styles.sourceChip, { backgroundColor: t.cardMuted }]}>
        <Icon name="info" size={12} color={t.textMuted} />
        <Text variant="caption" weight="600" tone="muted">
          {open ? 'Hide source' : 'Source'}
        </Text>
      </View>
      {open ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
          {children}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: Spacing.three }} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: { padding: Spacing.four },
  press: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: `${DURATION.press}ms`,
    transitionTimingFunction: EASE_OUT_CSS,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, marginBottom: Spacing.three },
  source: { marginTop: Spacing.three },
  sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
});
