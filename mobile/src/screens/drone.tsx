import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { FieldMap } from '@/components/charts/field-map';
import { LineChart } from '@/components/charts/line-chart';
import { pearson, Scatter } from '@/components/charts/scatter';
import { DataSourcePill } from '@/components/data-source-pill';
import { GrowBar, Meter, RangeMeter } from '@/components/charts/mini';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/controls';
import { Insight } from '@/components/ui/insight';
import { useProfile } from '@/lib/profile';
import { DRONE_TEAM_PHONE } from '@/screens/drone-request';
import { Card, CardHeader, SourceNote } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen, Section } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Stat, StatRow } from '@/components/ui/stat';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { longDate, shortDate } from '@/lib/format';

export function Drone() {
  const t = useTheme();
  const { bundle } = useData();
  const flights = bundle.drone_flights;
  const [id, setId] = useState(flights[flights.length - 1].id);
  const [zone, setZone] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const idRef = useRef(id);
  useEffect(() => {
    idRef.current = id;
  }, [id]);
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      const i = flights.findIndex((f) => f.id === idRef.current);
      if (i >= flights.length - 1) {
        setPlaying(false);
        return;
      }
      setZone(null);
      setId(flights[i + 1].id);
    }, 1400);
    return () => clearInterval(iv);
  }, [playing, flights]);
  const togglePlay = () => {
    if (!playing && idRef.current === flights[flights.length - 1].id) setId(flights[0].id);
    setPlaying(!playing);
  };
  const flight = flights.find((f) => f.id === id) ?? flights[0];
  const zones = bundle.drone_zones.filter((z) => z.flight_id === flight.id);
  const r = pearson(
    flights.map((f) => f.modis_ndvi),
    flights.map((f) => f.mean_canopy),
  );
  const zoneHa = (z: { w: number; h: number }) => (z.w * z.h * flight.cell_m * flight.cell_m) / 10000;
  const fieldHa = (flight.canopy.flat().filter((v) => v != null).length * flight.cell_m * flight.cell_m) / 10000;
  const problemHa = zones.reduce((s, z) => s + zoneHa(z), 0);
  const t0 = new Date(flights[0].flown_on).getTime();
  const day = (iso: string) => Math.round((new Date(iso).getTime() - t0) / 86400000);

  return (
    <Screen title="Drone" subtitle="A close check of your field" right={<DataSourcePill />}>
      <DroneStatus />
      <Insight
        icon="warning"
        color={t.status.serious}
        title={zones.length ? `${zones.length} weak spots need a look` : 'The whole field looks even'}
        detail={
          zones.length
            ? `${zones.map((z) => z.label).join(' and ')}: ${problemHa.toFixed(2)} ha of your ${fieldHa.toFixed(2)} ha`
            : 'No weak spots on this flight.'
        }>
        <GrowBar fraction={problemHa / fieldHa} color={t.status.serious} height={10} />
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
          {Math.round((100 * problemHa) / fieldHa)}% of the field
        </Text>
        <View style={[styles.demo, { backgroundColor: t.demoSoft, marginTop: 12 }]}>
          <Icon name="science" size={16} color={t.demo} />
          <Text variant="caption" style={{ color: t.demo, flex: 1 }}>
            Demo pictures until our first flight.
          </Text>
        </View>
      </Insight>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause time-lapse' : 'Play time-lapse'}
          onPress={togglePlay}
          style={[styles.play, { backgroundColor: playing ? t.brandSoft : t.brand }]}>
          <Icon name={playing ? 'pause' : 'play'} size={20} color={playing ? t.brand : '#fff'} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Segmented
            value={id}
            onChange={(v) => {
              setPlaying(false);
              setId(v);
              setZone(null);
            }}
            options={flights.map((f) => ({ value: f.id, label: shortDate(f.flown_on) }))}
          />
        </View>
      </View>

      <Card>
        <CardHeader
          title="How well the crop covers the ground"
          subtitle={`${flight.crop} · ${flight.stage} · ${longDate(flight.flown_on)}`}
          right={<Badge kind="demo" label="Demo" />}
        />
        <FieldMap flight={flight} zones={zones} selectedZone={zone} />
        <View style={{ marginTop: Spacing.four }}>
          <StatRow>
            <Stat
              label="Ground covered by crop"
              count={flight.mean_canopy}
              format={(v) => `${Math.round(v)}%`}
              viz={<Meter value={flight.mean_canopy} color={t.series[2]} />}
            />
            <Stat
              label="Weak area"
              count={flight.low_cover_pct}
              format={(v) => `${v.toFixed(0)}%`}
              viz={<Meter value={flight.low_cover_pct} color={t.status.serious} />}
              hint="Clearly thinner than the rest"
            />
          </StatRow>
          <View style={{ marginTop: Spacing.four }}>
            <Stat
              label="Thinnest to thickest parts of the field"
              value={`${Math.round(flight.p10_canopy)}–${Math.round(flight.p90_canopy)}%`}
              viz={
                <RangeMeter
                  value={flight.mean_canopy}
                  low={flight.p10_canopy}
                  high={flight.p90_canopy}
                  domain={[0, 100]}
                  color={t.series[2]}
                  lowLabel="0%"
                  highLabel="100%"
                />
              }
            />
          </View>
        </View>
        <SourceNote>
          Photos from {flight.altitude_m} m up, checked in {flight.cell_m} m squares. Tap a square to see it.
        </SourceNote>
      </Card>

      {zones.length ? (
        <Section title="Weak spots">
          {zones.map((z, i) => (
            <Pressable key={z.label} onPress={() => setZone(zone === i ? null : i)}>
              <Card style={zone === i ? { borderColor: t.status[z.severity], borderWidth: 1.5 } : undefined}>
                <View style={styles.zone}>
                  <View style={[styles.num, { backgroundColor: t.status[z.severity] }]}>
                    <Text variant="caption" weight="700" style={{ color: '#fff' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="heading" style={{ flex: 1 }}>
                        {z.label}
                      </Text>
                      <Badge kind={z.severity} label={z.severity === 'serious' ? 'Act now' : z.severity === 'warning' ? 'Watch' : 'OK'} />
                    </View>
                    <Text variant="caption" tone="secondary">
                      {z.note}
                    </Text>
                    <View style={{ marginTop: 4, gap: 4 }}>
                      <GrowBar fraction={zoneHa(z) / fieldHa} color={t.status[z.severity]} height={6} delay={i * 80} />
                      <Text variant="caption" tone="muted">
                        {zoneHa(z).toFixed(2)} ha · {Math.round((100 * zoneHa(z)) / fieldHa)}% of the field
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section title="Drone and satellite agree">
        <Card>
          <CardHeader title="Drone vs satellite" subtitle="One dot for each drone flight" right={<Badge kind="nasa" label="NASA" />} />
          <Scatter
            points={flights.map((f) => ({ key: f.id, x: f.modis_ndvi, y: f.mean_canopy, label: shortDate(f.flown_on) }))}
            xLabel="Satellite greenness"
            yLabel="Drone: ground covered %"
            animateKey={flight.id}
          />
          <View style={[styles.agree, { backgroundColor: t.cardMuted }]}>
            <Text variant="label" weight="600">
              {r > 0.7 ? 'They agree well' : r > 0.4 ? 'They partly agree' : 'They do not agree yet'} (r = {r.toFixed(2)})
            </Text>
            <Text variant="caption" tone="secondary">
              When the satellite sees a greener field, the drone sees more crop. The satellite sees your whole field as one dot; the drone
              sees every corner. Demo data from {flights.length} flights: this shows the idea, not a result.
            </Text>
          </View>
        </Card>
        <Card>
          <CardHeader title="Through the season" subtitle="Drone and satellite rise and fall together" />
          <LineChart
            series={[
              {
                key: 'drone',
                label: 'Drone: ground covered',
                color: t.series[2],
                dots: true,
                points: flights.map((f) => ({ x: day(f.flown_on), y: f.mean_canopy })),
              },
              {
                key: 'modis',
                label: 'Satellite greenness',
                color: t.series[0],
                dots: true,
                dashed: true,
                points: flights.map((f) => ({ x: day(f.flown_on), y: f.modis_ndvi * 100 })),
              },
            ]}
            xTicks={flights.map((f) => day(f.flown_on))}
            formatX={(d) => shortDate(flights.find((f) => day(f.flown_on) === d)?.flown_on ?? flights[0].flown_on)}
            formatY={(v) => v.toFixed(0)}
          />
          <SourceNote>Both on a 0–100 scale so they fit one chart; they measure different things.</SourceNote>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  play: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: 12, minHeight: 40 },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  stepLine: { width: 2, flex: 1, marginVertical: 2 },
  pulse: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  demo: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  zone: { flexDirection: 'row', gap: 12 },
  num: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  agree: { marginTop: Spacing.three, padding: 12, borderRadius: 12, gap: 4 },
  ladder: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
});

const CHECK_NAMES: Record<string, string> = {
  health: 'crop health',
  water: 'wet and dry spots',
  soil: 'soil samples',
  pests: 'insects and disease',
};

const STEPS = [
  { key: 'requested', label: 'Request sent' },
  { key: 'scheduled', label: 'Team calls you and books a day' },
  { key: 'surveyed', label: 'Drone flies over your field' },
  { key: 'report', label: 'Report ready in the app' },
] as const;

const PULSE = { from: { opacity: 0.35, transform: [{ scale: 0.85 }] }, to: { opacity: 1, transform: [{ scale: 1.15 }] } };

/** The farmer's drone request (status timeline) or a button to make one. */
function DroneStatus() {
  const t = useTheme();
  const { drone } = useProfile();
  if (!drone) {
    return (
      <Card tone="brand">
        <Text variant="title">Ask for a drone check</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
          Our team flies over your field, takes soil samples and sends you a full report: weak spots, wet spots, insects and what your soil
          needs.
        </Text>
        <Button label="Request a drone check" icon="drone" onPress={() => router.push('/drone-request')} style={{ marginTop: 14 }} />
        {DRONE_TEAM_PHONE ? (
          <Button
            label="Call the drone team"
            icon="phone"
            kind="ghost"
            onPress={() => Linking.openURL(`tel:${DRONE_TEAM_PHONE}`)}
            style={{ marginTop: 10 }}
          />
        ) : null}
      </Card>
    );
  }
  const at = STEPS.findIndex((x) => x.key === drone.status);
  return (
    <Card>
      <Text variant="overline" tone="brand">
        Your drone check
      </Text>
      <Text variant="title" style={{ marginTop: 2 }}>
        Planned for {drone.date}
      </Text>
      <View style={{ marginTop: 14, gap: 0 }}>
        {STEPS.map((step, i) => {
          const done = i < at;
          const now = i === at;
          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: done ? t.status.good : now ? t.brand : t.cardMuted,
                      borderColor: done || now ? 'transparent' : t.border,
                    },
                  ]}>
                  {done ? <Icon name="check" size={12} color="#fff" /> : null}
                  {now ? (
                    <Animated.View
                      style={[
                        styles.pulse,
                        { borderColor: t.brand },
                        {
                          animationName: PULSE,
                          animationDuration: '900ms',
                          animationIterationCount: 'infinite',
                          animationDirection: 'alternate',
                          animationTimingFunction: 'ease-in-out',
                        },
                      ]}
                    />
                  ) : null}
                </View>
                {i < STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: done ? t.status.good : t.border }]} /> : null}
              </View>
              <Text variant="label" weight={now ? '700' : '500'} tone={i > at ? 'muted' : 'primary'} style={{ flex: 1, paddingTop: 2 }}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text variant="caption" tone="secondary" style={{ marginTop: 6 }}>
        Checking: {drone.checks.map((c) => CHECK_NAMES[c] ?? c).join(', ')} · We will call {drone.phone}
      </Text>
      {DRONE_TEAM_PHONE ? (
        <Button
          label="Call the drone team"
          icon="phone"
          kind="secondary"
          onPress={() => Linking.openURL(`tel:${DRONE_TEAM_PHONE}`)}
          style={{ marginTop: 12 }}
        />
      ) : null}
    </Card>
  );
}
