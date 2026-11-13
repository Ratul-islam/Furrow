/**
 * Small NASA charts about a place, for screens that would otherwise be text only
 * (map check step, onboarding questions, the analysing step).
 */

import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { MiniBars, Sparkline } from '@/components/charts/mini';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { MONTH_INITIALS, whole } from '@/lib/format';
import { useEntrance } from '@/lib/motion';

export type FactKind = 'rain' | 'monsoon' | 'dry' | 'heat' | 'green' | 'future' | 'cold' | 'soil';

/** One small chart tile: title, chart, one-line takeaway. Animates in. */
export function FactTile({ kind, index = 0, compact }: { kind: FactKind; index?: number; compact?: boolean }) {
  const t = useTheme();
  const { bundle } = useData();
  const e = useEntrance(index);
  const m = bundle.climate_monthly;
  const year = m.reduce((s, x) => s + x.rain_mm, 0);
  const monsoon = m.filter((x) => x.month >= 6 && x.month <= 9).reduce((s, x) => s + x.rain_mm, 0);
  const dry = m.filter((x) => x.month >= 11 || x.month <= 4).reduce((s, x) => s + x.rain_mm, 0);
  const heat = bundle.predictions.find((p) => p.id === 'heat-mar-apr-2027');

  const SHORT: Record<FactKind, string> = { rain: 'Rain', monsoon: 'Monsoon', dry: 'Dry season', heat: 'Hot days', cold: 'Cold nights', soil: 'Soil water', green: 'Green', future: 'Ahead' };
  const spec: Record<FactKind, { icon: IconName; color: string; title: string; say: string; chart: React.ReactNode; months?: boolean }> = {
    rain: { icon: 'rain', color: t.series[0], title: 'Rain each month', say: `${whole(year)} mm a year`, chart: <MiniBars values={m.map((x) => x.rain_mm)} highlight={[5, 6, 7, 8]} accent={t.series[0]} height={compact ? 30 : 40} />, months: true },
    monsoon: { icon: 'flood', color: t.series[0], title: 'Rainy-season rain', say: `${Math.round((100 * monsoon) / year)}% falls Jun–Sep`, chart: <MiniBars values={m.map((x) => x.rain_mm)} highlight={[5, 6, 7, 8]} accent={t.series[0]} height={compact ? 30 : 40} />, months: true },
    dry: { icon: 'dry', color: t.series[3], title: 'Dry-season rain', say: `Only ${whole(dry)} mm Nov–Apr`, chart: <MiniBars values={m.map((x) => x.rain_mm)} highlight={[10, 11, 0, 1, 2, 3]} accent={t.series[3]} height={compact ? 30 : 40} />, months: true },
    heat: { icon: 'sun', color: t.series[1], title: 'Very hot days', say: `${whole(m[2].heat_days + m[3].heat_days)} in Mar–Apr`, chart: <MiniBars values={m.map((x) => x.heat_days)} highlight={[2, 3]} accent={t.series[1]} height={compact ? 30 : 40} />, months: true },
    cold: { icon: 'cold', color: t.series[0], title: 'Cold nights', say: `${whole(m[0].cold_days)} in January`, chart: <MiniBars values={m.map((x) => x.cold_days)} highlight={[0, 11]} accent={t.series[0]} height={compact ? 30 : 40} />, months: true },
    soil: { icon: 'water', color: t.series[2], title: 'Soil water', say: 'Driest in Mar–Apr', chart: <MiniBars values={m.map((x) => x.gwet_root * 100)} highlight={[2, 3]} accent={t.series[3]} color={t.series[2]} height={compact ? 30 : 40} />, months: true },
    green: {
      icon: 'leaf',
      color: t.series[2],
      title: 'Crop greenness',
      say: 'Two crops a year',
      chart: <Sparkline values={bundle.ndvi_climatology.map((d) => d.mean)} color={t.series[2]} height={compact ? 30 : 40} markLast={false} />,
    },
    future: {
      icon: 'climate',
      color: t.series[1],
      title: 'Hot days ahead',
      say: heat ? `${whole(heat.detail.baseline as number)} → ${whole(heat.value)} by 2027` : 'More heat ahead',
      chart: heat ? <MiniBars values={[heat.detail.baseline as number, heat.value ?? 0]} highlight={[1]} accent={t.series[1]} height={compact ? 30 : 40} /> : null,
    },
  };
  const s = spec[kind];
  return (
    <Animated.View style={[styles.tile, { backgroundColor: t.card, borderColor: t.border }, e]}>
      <View style={styles.head}>
        <Icon name={s.icon} size={14} color={s.color} />
        <Text variant="caption" weight="700" numberOfLines={1} style={{ flex: 1 }}>
          {compact ? SHORT[kind] : s.title}
        </Text>
      </View>
      {s.chart}
      {s.months && !compact ? (
        <View style={{ flexDirection: 'row' }}>
          {MONTH_INITIALS.map((mo, i) => (
            <Text key={i} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center', fontSize: 9, lineHeight: 12 }}>
              {mo}
            </Text>
          ))}
        </View>
      ) : null}
      <Text variant="caption" tone="secondary" numberOfLines={2}>
        {s.say}
      </Text>
    </Animated.View>
  );
}

/** A row of fact tiles that share the width. */
export function FactRow({ kinds, compact, startIndex = 0 }: { kinds: FactKind[]; compact?: boolean; startIndex?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {kinds.map((k, i) => (
        <View key={k} style={{ flex: 1 }}>
          <FactTile kind={k} index={startIndex + i} compact={compact} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
