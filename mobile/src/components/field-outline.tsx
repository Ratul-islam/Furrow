import { View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { DrawMask, useWidth } from '@/components/charts/kit';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/lib/geo';

/** The farmer's field shape as drawn on the map (north up), revealed with a sweep. */
export function FieldOutline({ points, height = 120, bg }: { points: LatLng[]; height?: number; bg?: string }) {
  const t = useTheme();
  const { width, onLayout } = useWidth(200);
  if (points.length < 3) return <View style={{ height }} />;
  const lat0 = points.reduce((s, p) => s + p[0], 0) / points.length;
  const xy = points.map(([lat, lng]) => [lng * Math.cos((lat0 * Math.PI) / 180), -lat]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 12;
  const s = Math.min((width - 2 * pad) / (x1 - x0 || 1), (height - 2 * pad) / (y1 - y0 || 1));
  const ox = (width - (x1 - x0) * s) / 2;
  const oy = (height - (y1 - y0) * s) / 2;
  const pts = xy.map(([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s]);
  return (
    <View style={{ height, width: '100%' }} onLayout={onLayout}>
      <Svg width={width} height={height}>
        <Polygon points={pts.map((p) => p.join(',')).join(' ')} fill={t.series[2] + '40'} stroke={t.brand} strokeWidth={2.5} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={4} fill={t.card} stroke={t.brand} strokeWidth={2} />
        ))}
      </Svg>
      <DrawMask bg={bg} animateKey={points.length} />
    </View>
  );
}
