import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCountUp } from '@/lib/motion';

import { Icon, type IconName } from './icon';
import { Text } from './text';

/**
 * The answer, first. Sits at the top of a screen or section where the eye lands:
 * one plain sentence, an optional key number, and a picture underneath.
 */
export function Insight({
  icon,
  color,
  title,
  detail,
  children,
}: {
  icon: IconName;
  color?: string;
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  const c = color ?? t.brand;
  return (
    <View style={[styles.box, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: c + '1f' }]}>
          <Icon name={icon} size={18} color={c} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" style={{ fontSize: 17, lineHeight: 23 }}>
            {title}
          </Text>
          {detail && detail.length <= 60 ? (
            <Text variant="caption" tone="secondary">
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      {children ? <View style={{ marginTop: Spacing.three }}>{children}</View> : null}
    </View>
  );
}

/** A number that counts up to its value when it appears or changes. */
export function CountUp({ value, format, style, variant = 'number' }: { value: number; format: (v: number) => string; style?: object; variant?: 'number' | 'title' | 'label' }) {
  const v = useCountUp(value);
  return (
    <Text variant={variant} style={style}>
      {format(v)}
    </Text>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.four },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
