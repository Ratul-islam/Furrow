import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useCountUp } from '@/lib/motion';

import { Text } from './text';

/**
 * A headline number with its unit, a picture (`viz`) and one line of context.
 * Reading order follows the eye: label → number → picture → context.
 * Pass `count` + `format` to have the number count up.
 */
export function Stat({
  label,
  value,
  count,
  format,
  unit,
  hint,
  viz,
  size = 'md',
}: {
  label: string;
  value?: string;
  count?: number;
  format?: (v: number) => string;
  unit?: string;
  hint?: ReactNode;
  viz?: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <View style={styles.valueRow}>
        {count != null && format ? (
          <Counting value={count} format={format} size={size} />
        ) : (
          <Text variant="number" style={size === 'lg' ? styles.lg : styles.md}>
            {value}
          </Text>
        )}
        {unit ? (
          <Text variant="caption" tone="secondary" style={{ marginBottom: 3 }}>
            {unit}
          </Text>
        ) : null}
      </View>
      {viz ? <View style={{ marginTop: 6, marginBottom: 2 }}>{viz}</View> : null}
      {hint ? (
        typeof hint === 'string' ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : (
          hint
        )
      ) : null}
    </View>
  );
}

function Counting({ value, format, size }: { value: number; format: (v: number) => string; size: 'md' | 'lg' }) {
  const v = useCountUp(value);
  return (
    <Text variant="number" style={size === 'lg' ? styles.lg : styles.md}>
      {format(v)}
    </Text>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  stat: { flex: 1, gap: 2, minWidth: 0 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: Spacing.five },
  md: { fontSize: 24, lineHeight: 28 },
  lg: { fontSize: 34, lineHeight: 38 },
});
