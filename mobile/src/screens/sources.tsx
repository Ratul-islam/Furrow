import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/controls';
import { useProfile } from '@/lib/profile';
import { Reveal } from '@/components/ui/screen';
import { Card, CardHeader } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { longDate } from '@/lib/format';

export function Sources() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { bundle, source, error } = useData();
  const { reset } = useProfile();
  const { field, thresholds } = bundle;
  const groups: { kind: 'nasa' | 'method' | 'demo'; title: string }[] = [
    { kind: 'nasa', title: 'NASA data' },
    { kind: 'method', title: 'Methods' },
    { kind: 'demo', title: 'Demo data in this build' },
  ];
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.inner}>
        <Reveal index={0}>
          <Card>
            <CardHeader title="Data coverage" subtitle="Years each source covers for this field" />
            <Coverage
              rows={[
                {
                  label: 'NASA POWER',
                  from: 1996,
                  to: 2026,
                  color: t.series[0],
                },
                {
                  label: 'MODIS NDVI',
                  from: 2000,
                  to: 2026,
                  color: t.series[2],
                },
                {
                  label: 'CMIP6 (sampled)',
                  from: 2005,
                  to: 2060,
                  color: t.series[1],
                  dashed: true,
                },
                { label: 'Drone (demo)', from: 2026, to: 2026, color: t.demo },
              ]}
            />
          </Card>
        </Reveal>
        <Reveal index={1}>
          <Card>
            <CardHeader title="This field" subtitle={`${field.name}, ${field.upazila}, ${field.district}`} />
            <Row k="Location" v={`${field.lat}°N, ${field.lon}°E (rounded to 0.1°)`} />
            <Row k="NASA data through" v={longDate(field.data_through)} />
            <Row k="Bundle built" v={longDate(bundle.generated)} />
            <Row k="Served from" v={source === 'supabase' ? 'Supabase (live)' : 'Bundled offline copy'} />
            {error ? <Row k="Sync error" v={error} /> : null}
            <Row k="Soil profile" v={`${field.soil.texture}, OM ${field.soil.organic_matter_pct}%, pH ${field.soil.ph} (demo)`} />
          </Card>
        </Reveal>

        {groups.map((g, gi) => (
          <Reveal key={g.kind} index={gi + 2}>
            <View style={{ gap: Spacing.three }}>
              <Text variant="overline" tone="secondary" style={{ paddingHorizontal: 2 }}>
                {g.title}
              </Text>
              {bundle.sources
                .filter((s) => s.kind === g.kind)
                .map((s) => (
                  <Card key={s.id}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                      }}>
                      <Text variant="heading" style={{ flex: 1 }}>
                        {s.name}
                      </Text>
                      {s.kind === 'nasa' ? (
                        <Badge kind="nasa" label="NASA" />
                      ) : s.kind === 'demo' ? (
                        <Badge kind="demo" label="Demo" />
                      ) : null}
                    </View>
                    <Text variant="caption" tone="secondary">
                      {s.product}
                    </Text>
                    <Text variant="caption" style={{ marginTop: 6 }}>
                      Used for: {s.use}
                    </Text>
                    {s.doi || s.url ? (
                      <Pressable onPress={() => s.url && WebBrowser.openBrowserAsync(s.url)} style={{ marginTop: 6 }}>
                        <Text variant="caption" weight="600" style={{ color: t.series[0] }}>
                          {s.doi ? `doi:${s.doi}` : s.url}
                        </Text>
                      </Pressable>
                    ) : null}
                  </Card>
                ))}
            </View>
          </Reveal>
        ))}

        <Card tone="muted">
          <CardHeader title="Thresholds (for the agronomy lead to confirm)" />
          <Row k="Heat stress" v={`Tmax ≥ ${thresholds.heat_c} °C at flowering (rice); ≥ 38 °C for mungbean`} />
          <Row k="Cold stress" v={`Tmin < ${thresholds.cold_c} °C at booting and flowering (rice)`} />
          <Row k="Dry day" v={`< ${thresholds.dry_mm} mm rain`} />
          <Row
            k="POWER Tmax adjustment"
            v={`${bundle.power_notes.tmax_offset_by_month.map((o) => (o > 0 ? '+' : '') + o.toFixed(1)).join(', ')} °C (Jan–Dec)`}
          />
          <Row k="Trend period" v={`${bundle.power_notes.trend_years} (POWER record shifts in ${bundle.power_notes.break_year})`} />
          <Row k="Paddy percolation" v="90 mm a month; puddling 150 mm; AWD saves 25%" />
          <Row k="Decision rule" v="Minimax regret across observed climate and CMIP6 futures" />
        </Card>
        <Button
          label="Start over with a new field"
          icon="undo"
          kind="ghost"
          onPress={async () => {
            await reset();
            router.replace('/onboarding');
          }}
        />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          Decision support, not a forecast. Open source under Apache 2.0.
        </Text>
      </View>
    </ScrollView>
  );
}

const GROW_X = { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } };

function Coverage({
  rows,
}: {
  rows: {
    label: string;
    from: number;
    to: number;
    color: string;
    dashed?: boolean;
  }[];
}) {
  const t = useTheme();
  const lo = 1995;
  const hi = 2061;
  const pos = (y: number) => ((y - lo) / (hi - lo)) * 100;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, k) => (
        <View key={r.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" weight="600">
              {r.label}
            </Text>
            <Text variant="caption" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              {r.from === r.to ? r.from : `${r.from}–${r.to}`}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: t.cardMuted }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: `${pos(r.from)}%`,
                  width: `${Math.max(Math.min(pos(r.to + 1), 100) - pos(r.from), 1.5)}%`,
                  top: 0,
                  bottom: 0,
                  borderRadius: 4,
                  backgroundColor: r.color,
                  opacity: r.dashed ? 0.55 : 1,
                  transformOrigin: 'left',
                },
                { animationName: GROW_X, animationDuration: '700ms', animationDelay: `${150 + k * 120}ms`, animationTimingFunction: 'ease-out', animationFillMode: 'backwards' },
              ]}
            />
            <View
              style={{
                position: 'absolute',
                left: `${pos(2026)}%`,
                top: -3,
                bottom: -3,
                width: 2,
                backgroundColor: t.text,
                opacity: 0.5,
              }}
            />
          </View>
        </View>
      ))}
      <View style={{ height: 18 }}>
        {[1995, 2010, 2026, 2040, 2060].map((y) => (
          <Text
            key={y}
            variant="caption"
            tone="muted"
            style={{ position: 'absolute', left: `${pos(y)}%`, transform: [{ translateX: y === 1995 ? 0 : y === 2060 ? -34 : -16 }] }}>
            {y === 2026 ? 'Now' : y}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted" style={{ width: 118 }}>
        {k}
      </Text>
      <Text variant="caption" style={{ flex: 1 }}>
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.five },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
});
