import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_IN_OUT } from '@/lib/motion';

import { GrowBar } from './mini';

export type HBarRow = { key: string; label: string; value: number; display: string; highlight?: boolean; color?: string };

const reflow = LinearTransition.duration(DURATION.bar).easing(EASE_IN_OUT);

/**
 * Horizontal bars with direct labels; the highlighted row carries the accent.
 * Bars grow in, glide to new values, and rows slide when the order changes.
 */
export function HBars({ rows, max = 100, color }: { rows: HBarRow[]; max?: number; color?: string }) {
  const t = useTheme();
  const accent = color ?? t.series[0];
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => (
        <Animated.View key={r.key} layout={reflow} style={{ gap: 5 }}>
          <View style={styles.labels}>
            <Text variant="caption" weight={r.highlight ? '700' : '500'} tone={r.highlight ? 'primary' : 'secondary'} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Text variant="label" weight="700" style={{ fontVariant: ['tabular-nums'] }}>
              {r.display}
            </Text>
          </View>
          <GrowBar fraction={r.value / max} color={r.color ?? accent} height={10} delay={i * 60} opacity={r.highlight ? 1 : 0.5} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
