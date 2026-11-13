import { scaleBand, scaleLinear } from 'd3-scale';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_OUT_CSS } from '@/lib/motion';

import { CHART_FONT, ChartBox, Legend, niceTicks, PAD, Tooltip, TouchLayer, useWidth, type LegendItem, type TipRow } from './kit';

export type BarDatum = {
  key: string;
  label: string; // axis label (may be blank to thin out labels)
  tipLabel?: string;
  values: number[]; // stacked segments, bottom first
  range?: [number, number]; // whisker (e.g. p20–p80)
  dot?: number | null; // overlay marker (e.g. this year)
  highlight?: boolean;
};

type Props = {
  data: BarDatum[];
  segments: { label: string; color: string }[];
  height?: number;
  formatY?: (y: number) => string;
  unit?: string;
  trend?: { a: number; b: number; label: string; xOf: (d: BarDatum, i: number) => number };
  dotLabel?: string;
  rangeLabel?: string;
  yMax?: number;
  dimOthers?: boolean;
  marker?: { key: string; label: string };
  animateKey?: string | number;
};


export function BarChart({
  data,
  segments,
  height = 180,
  formatY = (v) => String(Math.round(v)),
  unit,
  trend,
  dotLabel,
  rangeLabel,
  yMax,
  dimOthers,
  marker,
  animateKey,
}: Props) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const [sel, setSel] = useState<number | null>(null);

  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0));
  const maxV = yMax ?? Math.max(...totals, ...data.map((d) => d.range?.[1] ?? 0), ...data.map((d) => d.dot ?? 0)) * 1.08;
  const yt = niceTicks(0, maxV, 4);
  const top = Math.max(maxV, yt[yt.length - 1] ?? maxV);
  const x = scaleBand<string>()
    .domain(data.map((d) => d.key))
    .range([PAD.left, width - PAD.right])
    .paddingInner(data.length > 20 ? 0.25 : 0.3)
    .paddingOuter(0.1);
  const y = scaleLinear().domain([0, top]).range([height - PAD.bottom, PAD.top]);
  const bw = x.bandwidth();
  const gap = 2; // surface gap between stacked fills

  const onTouch = (px: number) => {
    const step = x.step();
    const i = Math.floor((px - PAD.left - x.paddingOuter() * step) / step);
    setSel(Math.max(0, Math.min(data.length - 1, i)));
  };

  const legendItems: LegendItem[] = [
    ...(segments.length > 1 || dotLabel || rangeLabel || trend ? segments.map((s) => ({ label: s.label, color: s.color, kind: 'box' as const })) : []),
    ...(rangeLabel ? [{ label: rangeLabel, color: t.axis, kind: 'line' as const }] : []),
    ...(dotLabel ? [{ label: dotLabel, color: t.text, kind: 'dot' as const }] : []),
    ...(trend ? [{ label: trend.label, color: t.textSecondary, kind: 'dash' as const }] : []),
  ];

  let tipRows: TipRow[] = [];
  if (sel != null) {
    const d = data[sel];
    tipRows = segments.map((s, i) => ({ label: s.label, value: `${formatY(d.values[i])}${unit ? ` ${unit}` : ''}`, color: s.color }));
    if (d.range) tipRows.push({ label: rangeLabel ?? 'Range', value: `${formatY(d.range[0])}–${formatY(d.range[1])}` });
    if (d.dot != null) tipRows.push({ label: dotLabel ?? 'Marker', value: `${formatY(d.dot)}${unit ? ` ${unit}` : ''}` });
  }

  const stagger = Math.min(40, 520 / Math.max(data.length, 1));
  const base = y(0);

  return (
    <View>
      {legendItems.length > 0 ? <Legend items={legendItems} /> : null}
      <ChartBox height={height} onLayout={onLayout} animateKey={animateKey} reveal={false}>
        {/* axes */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {yt.map((v) => (
            <G key={`y${v}`}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={t.grid} strokeWidth={1} />
              <SvgText fontFamily={CHART_FONT} x={PAD.left - 6} y={y(v) + 3} fontSize={11} fill={t.textMuted} textAnchor="end">
                {formatY(v)}
              </SvgText>
            </G>
          ))}
          {data.map((d) =>
            d.label ? (
              <SvgText key={d.key} fontFamily={CHART_FONT} x={(x(d.key) ?? 0) + bw / 2} y={height - 6} fontSize={11} fill={t.textMuted} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null,
          )}
        </Svg>

        {/* bars: views that grow from the baseline, one after another */}
        <View key={String(animateKey ?? 'bars')} style={StyleSheet.absoluteFill} pointerEvents="none">
          {data.map((d, i) => {
            const total = d.values.reduce((s2, v) => s2 + v, 0);
            const h = base - y(total);
            const faded = (dimOthers && !d.highlight) || (sel != null && sel !== i);
            return (
              <GrowColumn key={d.key} left={x(d.key) ?? 0} bottom={height - base} width={bw} height={h} delay={i * stagger} faded={faded}>
                {d.values.map((v, si) => {
                  const sh = base - y(v);
                  const isTop = d.values.slice(si + 1).every((q) => q === 0);
                  return v > 0 ? (
                    <View
                      key={si}
                      style={{
                        height: Math.max(sh - (si > 0 ? gap : 0), 0),
                        marginTop: si > 0 ? gap : 0,
                        backgroundColor: segments[si].color,
                        borderTopLeftRadius: isTop ? Math.min(4, bw / 2) : 0,
                        borderTopRightRadius: isTop ? Math.min(4, bw / 2) : 0,
                      }}
                    />
                  ) : null;
                })}
              </GrowColumn>
            );
          })}
        </View>

        {/* overlays: ranges, markers, trend (fade in once the bars have grown) */}
        <FadeLayer key={`o${String(animateKey ?? '')}`} delay={Math.min(data.length * stagger, 600)}>
          <Svg width={width} height={height}>
            {data.map((d) => {
              const bx = x(d.key) ?? 0;
              return (
                <G key={d.key}>
                  {d.range ? (
                    <G>
                      <Line x1={bx + bw / 2} x2={bx + bw / 2} y1={y(d.range[0])} y2={y(d.range[1])} stroke={t.textSecondary} strokeWidth={1.5} />
                      <Line x1={bx + bw * 0.3} x2={bx + bw * 0.7} y1={y(d.range[1])} y2={y(d.range[1])} stroke={t.textSecondary} strokeWidth={1.5} />
                      <Line x1={bx + bw * 0.3} x2={bx + bw * 0.7} y1={y(d.range[0])} y2={y(d.range[0])} stroke={t.textSecondary} strokeWidth={1.5} />
                    </G>
                  ) : null}
                  {d.dot != null ? <Circle cx={bx + bw / 2} cy={y(d.dot)} r={4} fill={t.text} stroke={t.card} strokeWidth={1.5} /> : null}
                </G>
              );
            })}
            {marker && x(marker.key) != null ? (
              <G>
                <Line x1={(x(marker.key) ?? 0) - (x.step() - bw) / 2} x2={(x(marker.key) ?? 0) - (x.step() - bw) / 2} y1={PAD.top} y2={height - PAD.bottom} stroke={t.axis} strokeDasharray="3 3" />
                <SvgText fontFamily={CHART_FONT} x={(x(marker.key) ?? 0) - (x.step() - bw) / 2 + 4} y={PAD.top + 9} fontSize={11} fill={t.textSecondary}>
                  {marker.label}
                </SvgText>
              </G>
            ) : null}
            {trend ? (
              <Line
                x1={(x(data[0].key) ?? 0) + bw / 2}
                x2={(x(data[data.length - 1].key) ?? 0) + bw / 2}
                y1={y(trend.a + trend.b * trend.xOf(data[0], 0))}
                y2={y(trend.a + trend.b * trend.xOf(data[data.length - 1], data.length - 1))}
                stroke={t.textSecondary}
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            ) : null}
          </Svg>
        </FadeLayer>
        <TouchLayer onTouch={onTouch} onEnd={() => setSel(null)} />
        {sel != null ? <Tooltip x={(x(data[sel].key) ?? 0) + bw / 2} width={width} title={data[sel].tipLabel ?? data[sel].label} rows={tipRows} /> : null}
      </ChartBox>
    </View>
  );
}

const GROW = { from: { transform: [{ scaleY: 0 }] }, to: { transform: [{ scaleY: 1 }] } };
const FADE = { from: { opacity: 0 }, to: { opacity: 1 } };

/** One bar column: grows from the baseline (transform only, UI thread). */
export function GrowColumn({
  left,
  bottom,
  width,
  height,
  delay,
  faded,
  children,
}: {
  left: number;
  bottom: number;
  width: number;
  height: number;
  delay: number;
  faded?: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          bottom,
          width,
          height: Math.max(height, 0),
          flexDirection: 'column-reverse',
          transformOrigin: 'bottom',
          opacity: faded ? 0.4 : 1,
          transitionProperty: 'opacity',
          transitionDuration: `${DURATION.state}ms`,
        },
        reduced
          ? null
          : { animationName: GROW, animationDuration: '560ms', animationDelay: `${Math.round(delay)}ms`, animationTimingFunction: EASE_OUT_CSS, animationFillMode: 'backwards' },
      ]}>
      {/* column-reverse stacks the first segment at the bottom */}
      {children}
    </Animated.View>
  );
}

function FadeLayer({ delay, children }: { delay: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, reduced ? null : { animationName: FADE, animationDuration: '300ms', animationDelay: `${Math.round(delay)}ms`, animationFillMode: 'backwards' }]}>
      {children}
    </Animated.View>
  );
}
