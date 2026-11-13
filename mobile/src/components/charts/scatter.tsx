import { scaleLinear } from 'd3-scale';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

import { CHART_FONT, ChartBox, niceTicks, PAD, Tooltip, TouchLayer, useWidth } from './kit';

export type ScatterPoint = { key: string; x: number; y: number; label: string };

export function Scatter({
  points,
  xLabel,
  yLabel,
  formatX = (v) => v.toFixed(2),
  formatY = (v) => String(Math.round(v)),
  height = 200,
  fit = true,
  animateKey,
  labelKeys,
  color,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  height?: number;
  fit?: boolean;
  animateKey?: string | number;
  /** only these points get a text label (default: all) */
  labelKeys?: string[];
  color?: string;
}) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const pad = { ...PAD, top: 22, bottom: 34, left: 40 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xr = [Math.min(...xs), Math.max(...xs)];
  const yr = [Math.min(...ys), Math.max(...ys)];
  const xp = (xr[1] - xr[0]) * 0.15 || 0.05;
  const yp = (yr[1] - yr[0]) * 0.15 || 5;
  const x = scaleLinear()
    .domain([xr[0] - xp, xr[1] + xp])
    .range([pad.left, width - pad.right]);
  const y = scaleLinear()
    .domain([yr[0] - yp, yr[1] + yp])
    .range([height - pad.bottom, pad.top]);
  const xt = niceTicks(xr[0] - xp, xr[1] + xp, 4);
  const yt = niceTicks(yr[0] - yp, yr[1] + yp, 4);

  // least-squares line
  const n = points.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  const sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0);
  const b = sxx ? xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0) / sxx : 0;
  const a = my - b * mx;

  const onTouch = (px: number, py: number) => {
    let best = 0;
    let bd = Infinity;
    points.forEach((p, i) => {
      const d = (x(p.x) - px) ** 2 + (y(p.y) - py) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setSel(bd < 40 * 40 ? best : null);
  };

  return (
    <View>
      <ChartBox height={height} onLayout={onLayout} animateKey={animateKey}>
        <Svg width={width} height={height}>
          {yt.map((v) => (
            <G key={`y${v}`}>
              <Line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={t.grid} />
              <SvgText fontFamily={CHART_FONT} x={pad.left - 6} y={y(v) + 3} fontSize={11} fill={t.textMuted} textAnchor="end">
                {formatY(v)}
              </SvgText>
            </G>
          ))}
          {xt.map((v) => (
            <SvgText
              fontFamily={CHART_FONT}
              key={`x${v}`}
              x={x(v)}
              y={height - pad.bottom + 14}
              fontSize={11}
              fill={t.textMuted}
              textAnchor="middle">
              {formatX(v)}
            </SvgText>
          ))}
          <SvgText
            fontFamily={CHART_FONT}
            x={(pad.left + width - pad.right) / 2}
            y={height - 4}
            fontSize={11}
            fill={t.textSecondary}
            textAnchor="middle">
            {xLabel}
          </SvgText>
          <SvgText fontFamily={CHART_FONT} x={pad.left} y={pad.top - 2} fontSize={11} fill={t.textSecondary}>
            {yLabel}
          </SvgText>
          {fit && n > 2 ? (
            <Line
              x1={x(xr[0] - xp * 0.5)}
              x2={x(xr[1] + xp * 0.5)}
              y1={y(a + b * (xr[0] - xp * 0.5))}
              y2={y(a + b * (xr[1] + xp * 0.5))}
              stroke={t.textSecondary}
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
          ) : null}
          {points.map((p, i) => (
            <G key={p.key}>
              <Circle
                cx={x(p.x)}
                cy={y(p.y)}
                r={sel === i ? 8 : points.length > 10 ? 5 : 6}
                fill={color ?? t.series[2]}
                stroke={t.card}
                strokeWidth={2}
              />
              {!labelKeys || labelKeys.includes(p.key) ? (
                <SvgText
                  fontFamily={CHART_FONT}
                  x={x(p.x) > width - 70 ? x(p.x) - 9 : x(p.x) + 9}
                  y={y(p.y) - 7}
                  fontSize={11}
                  fill={t.textSecondary}
                  textAnchor={x(p.x) > width - 70 ? 'end' : 'start'}>
                  {p.label}
                </SvgText>
              ) : null}
            </G>
          ))}
        </Svg>
        <TouchLayer onTouch={onTouch} onEnd={() => setSel(null)} />
        {sel != null ? (
          <Tooltip
            x={x(points[sel].x)}
            width={width}
            title={points[sel].label}
            rows={[
              { label: xLabel, value: formatX(points[sel].x) },
              { label: yLabel, value: formatY(points[sel].y) },
            ]}
          />
        ) : null}
      </ChartBox>
    </View>
  );
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}
