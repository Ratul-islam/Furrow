import { scaleLinear } from 'd3-scale';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

import { CHART_FONT, DrawMask, Legend, niceTicks, useWidth } from './kit';

export type RangeRow = {
  key: string;
  label: string;
  min: number;
  max: number;
  point: number; // the observed / central value
  color?: string;
  emphasis?: boolean;
};

/**
 * Horizontal range plot: one row per item, a bar from min to max across climate
 * futures and a dot for the observed value. Labels are direct, so no colour key is needed.
 */
export function RangePlot({
  rows,
  format = (v) => String(Math.round(v)),
  pointLabel = 'Observed climate',
  rangeLabel = 'Range across climate futures',
  domain,
  labelWidth = 104,
  animateKey,
}: {
  rows: RangeRow[];
  format?: (v: number) => string;
  pointLabel?: string;
  rangeLabel?: string;
  domain?: [number, number];
  labelWidth?: number;
  animateKey?: string | number;
}) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const rowH = 30;
  const top = 4;
  const height = top + rows.length * rowH + 20;
  const lo = domain?.[0] ?? Math.min(0, ...rows.map((r) => r.min));
  const hi = domain?.[1] ?? Math.max(...rows.map((r) => r.max)) * 1.1;
  const ticks = niceTicks(lo, hi, 4);
  const x = scaleLinear().domain([lo, Math.max(hi, ticks[ticks.length - 1])]).range([labelWidth, width - 30]);

  return (
    <View>
      <Legend
        items={[
          { label: pointLabel, color: t.textSecondary, kind: 'dot' },
          { label: rangeLabel, color: t.textSecondary, kind: 'band' },
        ]}
      />
      <View style={{ height, width: '100%' }} onLayout={onLayout}>
        <Svg width={width} height={height}>
          {ticks.map((v) => (
            <G key={v}>
              <Line x1={x(v)} x2={x(v)} y1={top} y2={height - 18} stroke={t.grid} strokeWidth={1} />
              <SvgText fontFamily={CHART_FONT} x={x(v)} y={height - 5} fontSize={11} fill={t.textMuted} textAnchor="middle">
                {format(v)}
              </SvgText>
            </G>
          ))}
          {rows.map((r, i) => {
            const cy = top + i * rowH + rowH / 2;
            const c = r.color ?? t.series[0];
            return (
              <G key={r.key}>
                <SvgText fontFamily={CHART_FONT} x={0} y={cy + 4} fontSize={12} fontWeight={r.emphasis ? '700' : '400'} fill={t.text}>
                  {r.label}
                </SvgText>
                <Rect x={x(r.min)} y={cy - 5} width={Math.max(x(r.max) - x(r.min), 3)} height={10} rx={5} fill={c} opacity={0.3} />
                <Circle cx={x(r.point)} cy={cy} r={5} fill={c} stroke={t.card} strokeWidth={2} />
                <SvgText fontFamily={CHART_FONT} x={x(r.max) + 6} y={cy + 4} fontSize={11} fill={t.textSecondary}>
                  {format(r.point)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        <DrawMask animateKey={animateKey} />
      </View>

    </View>
  );
}
