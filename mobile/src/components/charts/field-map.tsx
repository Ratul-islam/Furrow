import { scaleQuantize } from 'd3-scale';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { DroneFlight, DroneZone } from '@/lib/types';

import { CHART_FONT, DrawMask, Tooltip, TouchLayer, useWidth } from './kit';

/** Drone canopy-cover map: one cell per 5 m, sequential green ramp, zones outlined. */
export function FieldMap({ flight, zones, selectedZone }: { flight: DroneFlight; zones: DroneZone[]; selectedZone?: number | null }) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const cs = width / flight.cols;
  const height = cs * flight.rows;
  const ramp = t.canopy;
  const color = scaleQuantize<string>().domain([0, 100]).range([...ramp]);

  const onTouch = (px: number, py: number) => {
    const c = Math.floor(px / cs);
    const r = Math.floor(py / cs);
    if (c >= 0 && c < flight.cols && r >= 0 && r < flight.rows && flight.canopy[r][c] != null) setSel({ r, c });
  };

  const v = sel ? flight.canopy[sel.r][sel.c] : null;
  const zoneAt = sel ? zones.find((z) => sel.c >= z.x && sel.c < z.x + z.w && sel.r >= z.y && sel.r < z.y + z.h) : undefined;

  return (
    <View>
      <View style={{ width: '100%', height, borderRadius: 10, overflow: 'hidden', backgroundColor: t.cardMuted }} onLayout={onLayout}>
        <Svg width={width} height={height}>
          {flight.canopy.map((row, r) =>
            row.map((val, c) =>
              val == null ? null : (
                <Rect key={`${r}-${c}`} x={c * cs} y={r * cs} width={cs + 0.4} height={cs + 0.4} fill={color(val)} />
              ),
            ),
          )}
          {zones.map((z, i) => {
            const c = t.status[z.severity];
            const active = selectedZone === i;
            return (
              <G key={z.label}>
                <Rect
                  x={z.x * cs + 1}
                  y={z.y * cs + 1}
                  width={z.w * cs - 2}
                  height={z.h * cs - 2}
                  rx={6}
                  fill="none"
                  stroke={c}
                  strokeWidth={active ? 3 : 2}
                  strokeDasharray={active ? undefined : '6 4'}
                />
                <Rect x={z.x * cs + 4} y={z.y * cs + 4} width={18} height={16} rx={4} fill={c} />
                <SvgText fontFamily={CHART_FONT} x={z.x * cs + 13} y={z.y * cs + 16} fontSize={11} fontWeight="700" fill="#fff" textAnchor="middle">
                  {String(i + 1)}
                </SvgText>
              </G>
            );
          })}
          {sel ? <Rect x={sel.c * cs} y={sel.r * cs} width={cs} height={cs} fill="none" stroke={t.text} strokeWidth={2} /> : null}
        </Svg>
        <DrawMask animateKey={flight.id} />
        <TouchLayer onTouch={onTouch} onEnd={() => setSel(null)} />
        {sel && v != null ? (
          <View style={{ position: 'absolute', top: Math.max(sel.r * cs - 70, 4), left: 0, right: 0 }} pointerEvents="none">
            <Tooltip
              x={sel.c * cs + cs / 2}
              width={width}
              title={`Cell ${sel.c + 1}, ${sel.r + 1} · ${flight.cell_m} m`}
              rows={[{ label: 'Canopy cover', value: `${Math.round(v)}%`, color: color(v) }, ...(zoneAt ? [{ label: 'Zone', value: zoneAt.label }] : [])]}
            />
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Text variant="caption" tone="secondary">
          Bare
        </Text>
        <View style={{ flex: 1, flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {ramp.map((c) => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <Text variant="caption" tone="secondary">
          Full cover
        </Text>
      </View>
    </View>
  );
}
