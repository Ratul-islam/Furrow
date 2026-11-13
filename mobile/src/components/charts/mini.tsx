/**
 * Small charts that sit next to a number, so every figure has a picture:
 * GrowBar / Meter (part of a whole), RangeMeter (value against its usual range),
 * CompareBars (before vs after), Sparkline (a series), MiniBars (a series of counts).
 * All animate in on the UI thread and respect reduced motion.
 */

import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_IN_OUT, EASE_OUT } from '@/lib/motion';

import { GrowColumn } from './bar-chart';
import { DrawMask, useWidth } from './kit';

/** A bar that grows from the left to `fraction` (0–1) and glides when it changes. */
export function GrowBar({
  fraction,
  color,
  height = 8,
  delay = 0,
  track = true,
  opacity = 1,
}: {
  fraction: number;
  color: string;
  height?: number;
  delay?: number;
  track?: boolean;
  opacity?: number;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const f = Math.max(0, Math.min(1, fraction));
  const s = useSharedValue(reduced ? f : 0);
  useEffect(() => {
    if (reduced) {
      s.set(f);
      return;
    }
    s.set(withDelay(delay, withTiming(f, { duration: DURATION.bar, easing: s.get() === 0 ? EASE_OUT : EASE_IN_OUT })));
  }, [f, delay, reduced, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: s.get() }] }));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track ? t.cardMuted : 'transparent' }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color, borderRadius: height / 2, opacity, transformOrigin: 'left' },
          style,
        ]}
      />
    </View>
  );
}

/** Value out of a maximum, e.g. canopy cover 68 of 100. */
export function Meter({ value, max = 100, color, height = 8 }: { value: number; max?: number; color?: string; height?: number }) {
  const t = useTheme();
  return <GrowBar fraction={value / max} color={color ?? t.series[2]} height={height} />;
}

/** This value against its usual range: a band for the range, a marker for the value. */
export function RangeMeter({
  value,
  low,
  high,
  domain,
  color,
  lowLabel,
  highLabel,
}: {
  value: number;
  low: number;
  high: number;
  domain: [number, number];
  color?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const pos = (v: number) => Math.max(0, Math.min(1, (v - domain[0]) / (domain[1] - domain[0])));
  const mx = `${pos(value) * 100}%`;
  const slide = reduced
    ? null
    : { animationName: { from: { left: '0%', opacity: 0 }, to: { left: mx, opacity: 1 } }, animationDuration: '700ms', animationDelay: '150ms', animationTimingFunction: 'ease-out', animationFillMode: 'backwards' as const };
  const c = color ?? t.series[1];
  return (
    <View style={{ gap: 4 }}>
      <View style={{ height: 14, justifyContent: 'center' }}>
        <View style={[styles.track, { height: 6, borderRadius: 3, backgroundColor: t.cardMuted }]} />
        <View
          style={{
            position: 'absolute',
            left: `${pos(low) * 100}%`,
            width: `${Math.max(2, (pos(high) - pos(low)) * 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: t.series[2],
            opacity: 0.45,
          }}
        />
        <Animated.View
          key={mx}
          style={[{ position: 'absolute', left: mx, marginLeft: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: c, borderWidth: 2, borderColor: t.card }, slide]}
        />
      </View>
      {lowLabel || highLabel ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" tone="muted">
            {lowLabel}
          </Text>
          <Text variant="caption" tone="muted">
            {highLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Two (or a few) values side by side as horizontal bars with direct labels. */
export function CompareBars({
  items,
  format = (v) => String(Math.round(v)),
  max,
}: {
  items: { label: string; value: number; color: string }[];
  format?: (v: number) => string;
  max?: number;
}) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <View style={{ gap: 6 }}>
      {items.map((i, k) => (
        <View key={i.label} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {i.label}
            </Text>
            <Text variant="caption" weight="600" style={{ fontVariant: ['tabular-nums'] }}>
              {format(i.value)}
            </Text>
          </View>
          <GrowBar fraction={i.value / top} color={i.color} height={6} delay={k * 80} />
        </View>
      ))}
    </View>
  );
}

/** A small line for a series; the last point is marked. */
export function Sparkline({
  values,
  color,
  height = 40,
  bg,
  markLast = true,
  baseline,
}: {
  values: (number | null)[];
  color?: string;
  height?: number;
  bg?: string;
  markLast?: boolean;
  baseline?: number;
}) {
  const t = useTheme();
  const { width, onLayout } = useWidth(120);
  const c = color ?? t.series[0];
  const ys = values.filter((v): v is number => v != null);
  const lo = Math.min(...ys, baseline ?? Infinity);
  const hi = Math.max(...ys, baseline ?? -Infinity);
  const x = scaleLinear().domain([0, values.length - 1]).range([3, width - 5]);
  const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([height - 4, 4]);
  const d =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => y(v as number))(values) ?? '';
  let last = values.length - 1;
  while (last > 0 && values[last] == null) last--;
  return (
    <View style={{ height, width: '100%' }} onLayout={onLayout}>
      <Svg width={width} height={height}>
        {baseline != null ? <Line x1={0} x2={width} y1={y(baseline)} y2={y(baseline)} stroke={t.axis} strokeDasharray="3 3" /> : null}
        <Path d={d} stroke={c} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {markLast && values[last] != null ? <Circle cx={x(last)} cy={y(values[last] as number)} r={3.5} fill={c} stroke={bg ?? t.card} strokeWidth={1.5} /> : null}
      </Svg>
      <DrawMask bg={bg} animateKey={values.length} />
    </View>
  );
}

/** Small column chart: muted history, accented highlights; bars grow in one after another. */
export function MiniBars({
  values,
  highlight = [],
  color,
  accent,
  height = 44,
  whisker,
}: {
  values: number[];
  highlight?: number[];
  color?: string;
  accent?: string;
  height?: number;
  bg?: string;
  whisker?: { index: number; low: number; high: number };
}) {
  const t = useTheme();
  const { width, onLayout } = useWidth(120);
  const max = Math.max(...values, whisker?.high ?? 0, 1e-9);
  const n = values.length;
  const gap = n > 24 ? 1.5 : 2.5;
  const bw = (width - gap * (n - 1)) / n;
  const px = (v: number) => (v / max) * (height - 2);
  const stagger = Math.min(35, 420 / Math.max(n, 1));
  return (
    <View style={{ height, width: '100%' }} onLayout={onLayout}>
      <View key={values.join(',')} style={StyleSheet.absoluteFill}>
        {values.map((v, i) => {
          const hi = highlight.includes(i);
          return (
            <GrowColumn key={i} left={i * (bw + gap)} bottom={0} width={bw} height={Math.max(px(v), hi ? 4 : 1.5)} delay={i * stagger}>
              <View style={{ flex: 1, backgroundColor: hi ? (accent ?? t.series[1]) : (color ?? t.axis), opacity: hi ? 1 : 0.55, borderTopLeftRadius: Math.min(2, bw / 2), borderTopRightRadius: Math.min(2, bw / 2) }} />
            </GrowColumn>
          );
        })}
      </View>
      {whisker ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line x1={whisker.index * (bw + gap) + bw / 2} x2={whisker.index * (bw + gap) + bw / 2} y1={height - px(whisker.low)} y2={height - px(whisker.high)} stroke={t.text} strokeWidth={1.5} />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
