import { scaleLinear } from 'd3-scale';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { MONTH_INITIALS, MONTHS } from '@/lib/format';

import { CHART_FONT, ChartBox, Tooltip, TouchLayer, useWidth } from './kit';

/**
 * Year × period grid. Diverging by default (e.g. rain, % of normal: grey midpoint,
 * opposite hues); pass `ramp` for a one-hue sequential scale (e.g. greenness, hot days).
 * Columns default to the 12 months; pass `cols` for other periods (e.g. 16-day MODIS).
 */
export function HeatGrid({
  rows,
  value,
  domain,
  formatValue,
  lowLabel,
  highLabel,
  tipDetail,
  markYear,
  animateKey,
  ramp,
  cols,
  colTitle,
  tipDetailLabel = 'Rain',
}: {
  rows: { year: number; cells: (number | null)[] }[];
  value: string;
  domain: [number, number, number]; // low, mid, high
  formatValue: (v: number) => string;
  lowLabel: string;
  highLabel: string;
  tipDetail?: (year: number, month: number) => string;
  markYear?: { year: number; label: string };
  animateKey?: string | number;
  ramp?: readonly string[];
  cols?: string[];
  colTitle?: (c: number) => string;
  tipDetailLabel?: string;
}) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const left = 38;
  const top = 14;
  const heads = cols ?? MONTH_INITIALS;
  const n = heads.length;
  const cw = (width - left - 2) / n;
  const ch = 10;
  const height = top + rows.length * ch + 4;
  const d = ramp ?? t.diverging;
  const color = ramp
    ? scaleLinear<string>()
        .domain(ramp.map((_, i) => domain[0] + ((domain[2] - domain[0]) * i) / (ramp.length - 1)))
        .range([...ramp])
        .clamp(true)
    : scaleLinear<string>()
        .domain([domain[0], (domain[0] + domain[1]) / 2, domain[1] - (domain[1] - domain[0]) * 0.1, domain[1], domain[1] + (domain[2] - domain[1]) * 0.1, (domain[1] + domain[2]) / 2, domain[2]])
        .range([...d])
        .clamp(true);

  const onTouch = (px: number, py: number) => {
    const c = Math.floor((px - left) / cw);
    const r = Math.floor((py - top) / ch);
    if (c >= 0 && c < n && r >= 0 && r < rows.length) setSel({ r, c });
  };

  const selVal = sel ? rows[sel.r].cells[sel.c] : null;

  return (
    <View>
      <ChartBox height={height} onLayout={onLayout} animateKey={animateKey} direction="y">
        <Svg width={width} height={height}>
          {heads.map((m, i) => (
            <SvgText fontFamily={CHART_FONT} key={i} x={left + i * cw + cw / 2} y={10} fontSize={10} fill={t.textMuted} textAnchor="middle">
              {m}
            </SvgText>
          ))}
          {rows.map((row, ri) => (
            <G key={row.year}>
              {row.year % 5 === 0 || ri === 0 || ri === rows.length - 1 ? (
                <SvgText fontFamily={CHART_FONT} x={left - 6} y={top + ri * ch + ch - 1.5} fontSize={10} fill={t.textMuted} textAnchor="end">
                  {row.year}
                </SvgText>
              ) : null}
              {row.cells.map((v, ci) => (
                <Rect
                  key={ci}
                  x={left + ci * cw + 0.5}
                  y={top + ri * ch + 0.5}
                  width={cw - 1}
                  height={ch - 1}
                  rx={1.5}
                  fill={v == null ? t.cardMuted : color(v)}
                  stroke={sel && sel.r === ri && sel.c === ci ? t.text : 'none'}
                  strokeWidth={1.5}
                />
              ))}
            </G>
          ))}
          {markYear && rows.findIndex((r) => r.year === markYear.year) > 0 ? (
            <Line
              x1={left - 30}
              x2={width}
              y1={top + rows.findIndex((r) => r.year === markYear.year) * ch}
              y2={top + rows.findIndex((r) => r.year === markYear.year) * ch}
              stroke={t.text}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ) : null}
        </Svg>
        <TouchLayer onTouch={onTouch} onEnd={() => setSel(null)} />
        {sel && selVal != null ? (
          <View style={{ position: 'absolute', top: top + sel.r * ch - 64, left: 0, right: 0 }} pointerEvents="none">
            <Tooltip
              x={left + sel.c * cw + cw / 2}
              width={width}
              title={`${colTitle ? colTitle(sel.c) : MONTHS[sel.c]} ${rows[sel.r].year}`}
              rows={[
                { label: value, value: formatValue(selVal) },
                ...(tipDetail ? [{ label: tipDetailLabel, value: tipDetail(rows[sel.r].year, sel.c + 1) }] : []),
              ]}
            />
          </View>
        ) : null}
      </ChartBox>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Text variant="caption" tone="secondary">
          {lowLabel}
        </Text>
        <View style={{ flex: 1, flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {d.map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <Text variant="caption" tone="secondary">
          {highLabel}
        </Text>
      </View>
    </View>
  );
}
