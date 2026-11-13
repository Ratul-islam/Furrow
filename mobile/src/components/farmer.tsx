/**
 * Pictures a farmer reads at a glance: traffic-light zones and a planting calendar.
 * No decimals, no jargon; every colour also has a word.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { MONTHS } from '@/lib/format';

/**
 * Three zones (e.g. Poor / Normal / Good) and a marker for where things are now.
 * `low`/`high` are the edges of the middle zone, in the same units as `value`.
 */
export function LevelGauge({
  value,
  low,
  high,
  domain,
  labels = ['Poor', 'Normal', 'Good'],
  colors,
}: {
  value: number;
  low: number;
  high: number;
  domain: [number, number];
  labels?: [string, string, string];
  colors?: [string, string, string];
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const c = colors ?? [t.status.serious, t.status.warning, t.status.good];
  const pos = (v: number) => Math.max(0, Math.min(1, (v - domain[0]) / (domain[1] - domain[0])));
  const zones = [pos(low), pos(high) - pos(low), 1 - pos(high)];
  const zone = value < low ? 0 : value > high ? 2 : 1;
  const x = `${pos(value) * 100}%`;
  const slide = reduced
    ? null
    : { animationName: { from: { left: '0%', opacity: 0 }, to: { left: x, opacity: 1 } }, animationDuration: '700ms', animationDelay: '150ms', animationTimingFunction: 'ease-out', animationFillMode: 'backwards' as const };
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 30, justifyContent: 'flex-end' }}>
        <Animated.View key={x} style={[{ position: 'absolute', top: 0, left: x, marginLeft: -9, alignItems: 'center' }, slide]}>
          <Icon name="location" size={18} color={t.text} />
        </Animated.View>
        <View style={styles.bar}>
          {zones.map((w, i) => (
            <View key={i} style={{ flex: Math.max(w, 0.001), backgroundColor: c[i], opacity: i === zone ? 1 : 0.35 }} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((l, i) => (
          <Text
            key={l}
            variant="caption"
            weight={i === zone ? '700' : '500'}
            tone={i === zone ? 'primary' : 'muted'}
            style={{ flex: Math.max(zones[i], 0.18), textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Planting calendar: each slot is a planting date; green = best, yellow = OK, red = risky.
 * Built from the expected too-hot / too-cold days at flowering for each date.
 */
export function WindowStrip({
  rows,
  window,
  best,
}: {
  rows: { transplant: string; heat_days: number; cold_days: number }[];
  window: [string, string];
  best: string;
}) {
  const t = useTheme();
  const order = (mmdd: string) => {
    const [m, d] = mmdd.split('-').map(Number);
    return (m >= 11 ? m - 12 : m) * 100 + d;
  };
  const min = Math.min(...rows.map((r) => r.heat_days + r.cold_days));
  const level = (r: (typeof rows)[number]) => {
    const o = order(r.transplant);
    if (o >= order(window[0]) && o <= order(window[1])) return 0;
    return r.heat_days + r.cold_days <= min * 2 + 1.5 ? 1 : 2;
  };
  const colors = [t.status.good, t.status.warning, t.status.serious];
  const bestIdx = rows.findIndex((r) => r.transplant === best);
  const months = Array.from(new Set(rows.map((r) => Number(r.transplant.slice(0, 2)))));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 22, justifyContent: 'flex-end' }}>
        {bestIdx >= 0 ? (
          <View style={{ position: 'absolute', top: 0, left: `${((bestIdx + 0.5) / rows.length) * 100}%`, marginLeft: -9 }}>
            <Icon name="location" size={18} color={t.text} />
          </View>
        ) : null}
      </View>
      <View style={[styles.bar, { height: 18, gap: 2 }]}>
        {rows.map((r) => (
          <View key={r.transplant} style={{ flex: 1, backgroundColor: colors[level(r)], borderRadius: 3 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {months.map((m) => (
          <Text key={m} variant="caption" tone="secondary" style={{ flex: rows.filter((r) => Number(r.transplant.slice(0, 2)) === m).length }}>
            {MONTHS[m - 1]}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {[
          ['Best', colors[0]],
          ['OK', colors[1]],
          ['Risky', colors[2]],
        ].map(([l, c]) => (
          <View key={l} style={styles.legendItem}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} />
            <Text variant="caption" tone="secondary">
              {l}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Big round icon with a coloured ring: status at a glance. */
export function StatusDot({ level }: { level: 'good' | 'warning' | 'serious' }) {
  const t = useTheme();
  const c = t.status[level];
  return (
    <View style={[styles.dot, { backgroundColor: c + '26' }]}>
      <Icon name={level === 'good' ? 'check' : 'warning'} size={20} color={c} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  legend: { flexDirection: 'row', gap: 14, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
