import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

import { CHART_FONT, ChartBox, Legend, niceTicks, PAD, Tooltip, TouchLayer, useWidth, type LegendItem } from './kit';

export type LinePoint = { x: number; y: number | null };
export type LineSeries = {
  key: string;
  label: string;
  color: string;
  points: LinePoint[];
  dashed?: boolean;
  width?: number;
  dots?: boolean;
  hideInTooltip?: boolean;
};
export type Band = { label: string; color: string; points: { x: number; lo: number; hi: number }[] };

type Props = {
  series: LineSeries[];
  band?: Band;
  height?: number;
  yDomain?: [number, number];
  xDomain?: [number, number];
  xTicks?: number[];
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  formatTipX?: (x: number) => string;
  yUnit?: string;
  legend?: boolean;
  markers?: { x: number; label: string }[];
  animateKey?: string | number;
};

export function LineChart({
  series: seriesProp,
  band: bandProp,
  height = 180,
  yDomain,
  xDomain,
  xTicks,
  formatX = (x) => String(x),
  formatY = (y) => String(y),
  formatTipX,
  yUnit,
  legend = true,
  markers,
  animateKey,
}: Props) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const all = seriesProp;
  let series = all;
  const band = bandProp && !hidden.has(bandProp.label) ? bandProp : undefined;
  series = all.filter((s) => !hidden.has(s.label));
  if (!series.length) series = all;
  const toggle = (label: string) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = [
    ...series.flatMap((s) => s.points.map((p) => p.y).filter((y): y is number => y != null)),
    ...(band ? band.points.flatMap((p) => [p.lo, p.hi]) : []),
  ];
  const [x0, x1] = xDomain ?? [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = yDomain ?? [Math.min(...ys), Math.max(...ys)];
  if (!yDomain) {
    const padY = (y1 - y0) * 0.08 || 1;
    y0 -= padY;
    y1 += padY;
  }
  const yt = niceTicks(y0, y1, 4);
  const x = scaleLinear().domain([x0, x1]).range([PAD.left, width - PAD.right]);
  const y = scaleLinear().domain([y0, y1]).range([height - PAD.bottom, PAD.top]);
  const ticksX = xTicks ?? niceTicks(x0, x1, 5);

  const path = (pts: LinePoint[]) =>
    line<LinePoint>()
      .defined((p) => p.y != null)
      .x((p) => x(p.x))
      .y((p) => y(p.y as number))
      .curve(curveMonotoneX)(pts) ?? '';

  const bandPath = band
    ? area<{ x: number; lo: number; hi: number }>()
        .x((p) => x(p.x))
        .y0((p) => y(p.lo))
        .y1((p) => y(p.hi))
        .curve(curveMonotoneX)(band.points) ?? ''
    : '';

  // nearest x among all points
  const allX = Array.from(new Set(xs)).sort((a, b) => a - b);
  const onTouch = (px: number) => {
    const xv = x.invert(px);
    let best = allX[0];
    for (const v of allX) if (Math.abs(v - xv) < Math.abs(best - xv)) best = v;
    setSel(best);
  };

  const legendItems: LegendItem[] = [
    ...all.map((s) => ({ label: s.label, color: s.color, kind: (s.dashed ? 'dash' : 'line') as LegendItem['kind'] })),
    ...(bandProp ? [{ label: bandProp.label, color: bandProp.color, kind: 'band' as const }] : []),
  ];

  const tipRows =
    sel == null
      ? []
      : [
          ...series
            .filter((s) => !s.hideInTooltip)
            .map((s) => {
              const p = s.points.find((q) => q.x === sel);
              return p && p.y != null ? { label: s.label, value: `${formatY(p.y)}${yUnit ? ` ${yUnit}` : ''}`, color: s.color } : null;
            })
            .filter((r): r is NonNullable<typeof r> => r != null),
          ...(band
            ? (() => {
                const b = band.points.find((q) => q.x === sel);
                return b ? [{ label: band.label, value: `${formatY(b.lo)}–${formatY(b.hi)}` }] : [];
              })()
            : []),
        ];

  return (
    <View>
      {legend && legendItems.length > 1 ? <Legend items={legendItems} hidden={hidden} onToggle={all.length + (bandProp ? 1 : 0) > 1 ? toggle : undefined} /> : null}
      <ChartBox height={height} onLayout={onLayout} animateKey={`${animateKey ?? ''}|${[...hidden].join(',')}`}>
        <Svg width={width} height={height}>
          <G>
            {yt.map((v) => (
              <G key={`y${v}`}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={t.grid} strokeWidth={1} />
                <SvgText fontFamily={CHART_FONT} x={PAD.left - 6} y={y(v) + 3} fontSize={11} fill={t.textMuted} textAnchor="end">
                  {formatY(v)}
                </SvgText>
              </G>
            ))}
            {ticksX.map((v) => (
              <SvgText fontFamily={CHART_FONT}
                key={`x${v}`}
                x={x(v)}
                y={height - 6}
                fontSize={11}
                fill={t.textMuted}
                textAnchor={x(v) > width - PAD.right - 18 ? 'end' : x(v) < PAD.left + 12 ? 'start' : 'middle'}>
                {formatX(v)}
              </SvgText>
            ))}
          </G>
          {markers?.map((m) => (
            <G key={m.label}>
              <Line x1={x(m.x)} x2={x(m.x)} y1={PAD.top} y2={height - PAD.bottom} stroke={t.axis} strokeDasharray="3 3" strokeWidth={1} />
              <SvgText fontFamily={CHART_FONT} x={x(m.x) + 4} y={PAD.top + 9} fontSize={11} fill={t.textSecondary}>
                {m.label}
              </SvgText>
            </G>
          ))}
          {band ? <Path d={bandPath} fill={band.color} opacity={0.18} /> : null}
          {series.map((s) => (
            <G key={s.key}>
              <Path
                d={path(s.points)}
                stroke={s.color}
                strokeWidth={s.width ?? 2}
                fill="none"
                strokeDasharray={s.dashed ? '5 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.dots
                ? s.points.map((p) =>
                    p.y == null ? null : <Circle key={p.x} cx={x(p.x)} cy={y(p.y)} r={3.5} fill={s.color} stroke={t.card} strokeWidth={1.5} />,
                  )
                : null}
            </G>
          ))}
          {sel != null ? (
            <G>
              <Line x1={x(sel)} x2={x(sel)} y1={PAD.top} y2={height - PAD.bottom} stroke={t.axis} strokeWidth={1} />
              {series.map((s) => {
                const p = s.points.find((q) => q.x === sel);
                return p && p.y != null ? (
                  <Circle key={s.key} cx={x(sel)} cy={y(p.y)} r={4.5} fill={s.color} stroke={t.card} strokeWidth={2} />
                ) : null;
              })}
            </G>
          ) : null}
        </Svg>
        <TouchLayer onTouch={onTouch} onEnd={() => setSel(null)} />
        {sel != null && tipRows.length ? (
          <Tooltip x={x(sel)} width={width} title={(formatTipX ?? formatX)(sel)} rows={tipRows} />
        ) : null}
      </ChartBox>
    </View>
  );
}
