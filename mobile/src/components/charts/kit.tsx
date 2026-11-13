/**
 * Shared chart pieces: width measurement, the touch layer, tooltip and legend.
 *
 * Chart rules used across the app (dataviz method):
 *  - one y-axis per chart; recessive grid; 2px lines; rounded bar ends at the data end
 *  - categorical colours in fixed order (theme.series); text never wears series colour
 *  - >= 2 series always get a legend; every chart has a press-to-inspect tooltip
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_OUT } from '@/lib/motion';

export function useWidth(initial = 320) {
  const [width, setWidth] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };
  return { width, onLayout };
}

export const PAD = { top: 10, right: 10, bottom: 24, left: 38 };

/** react-native-svg text does not inherit the page font on web. */
export const CHART_FONT = Platform.OS === 'web' ? 'Inter, ui-sans-serif, system-ui, sans-serif' : undefined;

/**
 * Transparent layer over a chart that reports the touch x/y (in chart pixels).
 * Sits on top of the SVG so the event target is always this view (web reports
 * locationX relative to the target element).
 */
export function TouchLayer({
  onTouch,
  onEnd,
}: {
  onTouch: (x: number, y: number) => void;
  onEnd?: () => void;
}) {
  const handle = (e: GestureResponderEvent) => onTouch(e.nativeEvent.locationX, e.nativeEvent.locationY);
  return (
    <View
      style={StyleSheet.absoluteFill}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handle}
      onResponderMove={handle}
      onResponderRelease={onEnd}
      onResponderTerminationRequest={() => true}
      // web: hover works like touch
      {...({ onMouseMove: (e: { nativeEvent: { offsetX: number; offsetY: number } }) => onTouch(e.nativeEvent.offsetX, e.nativeEvent.offsetY), onMouseLeave: onEnd } as object)}
    />
  );
}

export type TipRow = { label: string; value: string; color?: string; dashed?: boolean };

export function Tooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: TipRow[] }) {
  const t = useTheme();
  const w = 184;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return (
    <View pointerEvents="none" style={[styles.tip, { left, width: w, backgroundColor: t.card, borderColor: t.border }]}>
      <Text variant="caption" weight="600" style={{ marginBottom: 2 }}>
        {title}
      </Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.tipRow}>
          {r.color ? <View style={[styles.swatch, { backgroundColor: r.color }]} /> : null}
          <Text variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
            {r.label}
          </Text>
          <Text variant="caption" weight="600" style={{ fontVariant: ['tabular-nums'] }}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export type LegendItem = { label: string; color: string; kind?: 'line' | 'dash' | 'box' | 'band' | 'dot' };

export function Legend({ items, hidden, onToggle }: { items: LegendItem[]; hidden?: Set<string>; onToggle?: (label: string) => void }) {
  const t = useTheme();
  return (
    <View style={styles.legend}>
      {items.map((i) => {
        const off = hidden?.has(i.label);
        const body = (
          <View style={[styles.legendItem, onToggle && styles.legendPress, onToggle && { borderColor: t.border, opacity: off ? 0.4 : 1 }]}>
            {i.kind === 'line' || i.kind === 'dash' ? (
              <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: i.kind === 'dash' ? 'dashed' : 'solid', borderColor: i.color }} />
            ) : i.kind === 'dot' ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i.color }} />
            ) : (
              <View style={{ width: 12, height: 10, borderRadius: 3, backgroundColor: i.color, opacity: i.kind === 'band' ? 0.35 : 1 }} />
            )}
            <Text variant="caption" tone="secondary" style={{ color: t.textSecondary, textDecorationLine: off ? 'line-through' : 'none' }}>
              {i.label}
            </Text>
          </View>
        );
        return onToggle ? (
          <Pressable key={i.label} accessibilityRole="button" accessibilityState={{ selected: !off }} accessibilityLabel={`Show or hide ${i.label}`} onPress={() => onToggle(i.label)} hitSlop={6}>
            {body}
          </Pressable>
        ) : (
          <View key={i.label}>{body}</View>
        );
      })}
    </View>
  );
}

/**
 * Reveals a chart left to right (or top to bottom) by sliding a card-coloured cover off it.
 * Transform-only, on the UI thread. Replays when `animateKey` changes (new data).
 */
export function DrawMask({ animateKey, direction = 'x', bg }: { animateKey?: string | number; direction?: 'x' | 'y'; bg?: string }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [size, setSize] = useState(0);
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      p.set(1);
      return;
    }
    p.set(0);
    p.set(withTiming(1, { duration: DURATION.draw, easing: EASE_OUT }));
  }, [animateKey, reduced, p]);
  // pixel offsets (measured), not percentages: works the same on iOS, Android and web
  const style = useAnimatedStyle(() => {
    const d = p.get() * (size + 2);
    return { opacity: p.get() < 1 ? 1 : 0, transform: [direction === 'x' ? { translateX: d } : { translateY: d }] };
  });
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onLayout={(e) => setSize(direction === 'x' ? e.nativeEvent.layout.width : e.nativeEvent.layout.height)}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bg ?? t.card }, style]} />
    </View>
  );
}

export function ChartBox({
  height,
  children,
  onLayout,
  animateKey,
  direction,
  reveal = true,
}: {
  height: number;
  children: ReactNode;
  onLayout: (e: LayoutChangeEvent) => void;
  animateKey?: string | number;
  direction?: 'x' | 'y';
  /** false when the chart animates its own marks (e.g. growing bars) */
  reveal?: boolean;
}) {
  return (
    <View style={{ height, width: '100%' }} onLayout={onLayout}>
      {children}
      {reveal ? <DrawMask animateKey={animateKey} direction={direction} /> : null}
    </View>
  );
}

/** "Nice" ticks without pulling in all of d3-array. */
export function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    top: -4,
    padding: 8,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    gap: 2,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendPress: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
