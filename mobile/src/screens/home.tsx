import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/alert-card';
import { BarChart } from '@/components/charts/bar-chart';
import { CompareBars } from '@/components/charts/mini';
import { DataSourcePill } from '@/components/data-source-pill';
import { LevelGauge, StatusDot } from '@/components/farmer';
import FieldMapPicker from '@/components/field-map-picker';
import { RotationStrip } from '@/components/rotation-strip';
import { Badge } from '@/components/ui/badge';
import { Card, SourceNote } from '@/components/ui/card';
import { Button } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen, Section } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { planTasks, type PlanTask } from '@/lib/engine';
import { dateRange, longDate, MONTHS, whole } from '@/lib/format';
import { areaText } from '@/lib/geo';
import { useProfile } from '@/lib/profile';
import { answerOf } from '@/lib/questions';

const TASK_ICON: Record<PlanTask['kind'], IconName> = { prepare: 'sprout', sow: 'leaf', transplant: 'sprout', watch: 'warning', harvest: 'harvest' };
const DRONE_STEP = { requested: 'Request sent', scheduled: 'Flight booked', surveyed: 'Field checked', report: 'Report ready' } as const;

export function Home() {
  const t = useTheme();
  const { profile, drone } = useProfile();
  const { bundle, evaluation, alerts } = useData();
  const { climate_recent: recent, climate_monthly: normals, predictions, boro_window: win } = bundle;
  const answers = profile?.answers ?? {};
  const growsAman = answerOf(answers, 'aman_crop') !== 'none';

  const aman = predictions.find((p) => p.id === 'aman-2026-condition');
  const health = aman?.value ?? 0;
  const weak = aman && health < (aman.range_low ?? 0);

  const rec = evaluation.recommended;
  const cur = evaluation.current;
  const waterShare = Math.round((100 * (cur.water.observed - rec.water.observed)) / Math.max(cur.water.observed, 1));
  const tasks = planTasks(rec.rotation, evaluation.cropIndex, win.window)
    .filter((x) => x.kind !== 'watch')
    .slice(0, 3);
  const top = alerts.filter((a) => a.level !== 'good').slice(0, 2);

  const rain30 = recent.slice(-30).reduce((s, d) => s + d.rain_mm, 0);
  const lastDay = recent[recent.length - 1];
  const month = Number(lastDay.date.slice(5, 7));
  const normalRain = normals[month - 1].rain_mm;
  const wet = lastDay.gwet_root * 100;
  const wetNormal = normals[month - 1].gwet_root * 100;

  return (
    <Screen title="My field" subtitle={profile ? areaText(profile.field.areaM2) : 'Demo field'} right={<DataSourcePill />}>
      <Card tone="brand">
        <View style={styles.statusRow}>
          <StatusDot level={weak ? 'warning' : 'good'} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title">{growsAman ? 'Aman rice is ripening' : 'Time to plan winter crops'}</Text>
            <Text variant="body" tone="secondary">
              {growsAman ? `The crop looks ${weak ? 'a little weaker than usual' : 'normal'} from space.` : 'The rainy season is over; the soil is drying.'}
            </Text>
          </View>
        </View>
        <View style={[styles.inner, { backgroundColor: t.card }]}>
          {profile ? (
            <View style={{ gap: 8 }}>
              <View style={[styles.mini, { borderColor: t.border }]}>
                <FieldMapPicker
                  mode="preview"
                  center={profile.field.center}
                  points={profile.field.points}
                  satellite
                  dom={{ style: { flex: 1 }, scrollEnabled: false } as never}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" weight="700">
                    {profile.field.name || 'My field'}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {areaText(profile.field.areaM2)}
                  </Text>
                </View>
                <Button label="Edit field" icon="edit" kind="secondary" onPress={() => router.push('/field-edit')} />
              </View>
            </View>
          ) : null}
          <Text variant="label" weight="700">
            Crop health from satellite
          </Text>
          {aman ? <LevelGauge value={health} low={aman.range_low ?? 0} high={aman.range_high ?? 1} domain={[0.6, 0.9]} /> : null}
        </View>
        <View style={styles.badges}>
          <Badge kind="nasa" label="NASA satellite data" />
        </View>
      </Card>

      {top.length ? (
        <Section title="Warnings" action={<LinkText label="See all" onPress={() => router.push('/alerts')} />}>
          {top.map((a) => (
            <AlertCard key={a.id} alert={a} compact onPress={() => router.push('/alerts')} />
          ))}
        </Section>
      ) : null}

      <Section title="Do this now" action={<LinkText label="Full plan" onPress={() => router.push('/plan')} />}>
        <Card padded={false} onPress={() => router.push('/plan')}>
          {tasks.map((task, i) => (
            <View key={task.title + task.start} style={[styles.action, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
              <View style={[styles.actionIcon, { backgroundColor: t.brandSoft }]}>
                <Icon name={TASK_ICON[task.kind]} size={18} color={t.brand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  <Text variant="heading" style={{ flex: 1 }}>
                    {task.title}
                  </Text>
                  <Text variant="label" weight="700" tone="brand">
                    {dateRange(task.start, task.end)}
                  </Text>
                </View>

              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Our advice for next year" action={<LinkText label="Details" onPress={() => router.push('/advice')} />}>
        <Card onPress={() => router.push('/advice')}>
          <Text variant="title">{rec.rotation.name.replaceAll(' – ', ' → ')}</Text>
          <View style={{ height: 10 }} />
          <Text variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
            You grow now
          </Text>
          <RotationStrip rotation={cur.rotation} crops={evaluation.cropIndex} compact />
          <Text variant="caption" tone="secondary" style={{ marginTop: 10, marginBottom: 4 }}>
            Next year
          </Text>
          <RotationStrip rotation={rec.rotation} crops={evaluation.cropIndex} compact showMonths />
          {rec !== cur ? (
            <View style={{ gap: 12, marginTop: 14 }}>
              <CompareBars
                items={[
                  { label: 'Irrigation now', value: cur.water.observed, color: t.series[1] },
                  { label: 'Irrigation next year', value: rec.water.observed, color: t.series[0] },
                ]}
                format={(v) => `${whole(v)} mm`}
              />
              <CompareBars
                max={100}
                items={[
                  { label: 'Soil health now', value: cur.soil.score, color: t.series[1] },
                  { label: 'Soil health next year', value: rec.soil.score, color: t.status.good },
                ]}
                format={(v) => `${Math.round(v)} / 100`}
              />
              {waterShare > 5 ? <Benefit icon="water" text={`${waterShare}% less water`} /> : null}
            </View>
          ) : (
            <Benefit icon="check" text="What you grow now is already the safest choice" />
          )}
        </Card>
      </Section>

      <Section title="Drone check">
        <Card tone="muted">
          <View style={styles.statusRow}>
            <View style={[styles.droneIcon, { backgroundColor: t.brand }]}>
              <Icon name="drone" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{drone ? DRONE_STEP[drone.status] : 'Need a closer look?'}</Text>
              <Text variant="caption" tone="secondary">
                {drone ? `For ${drone.date}` : 'Drone flight + soil test'}
              </Text>
            </View>
          </View>
          <Button
            label={drone ? 'See my request' : 'Request a drone check'}
            icon={drone ? 'arrow' : 'drone'}
            kind={drone ? 'secondary' : 'primary'}
            onPress={() => router.push(drone ? '/drone' : '/drone-request')}
            style={{ marginTop: 14 }}
          />
        </Card>
      </Section>

      <Section title="Rain and soil, last 3 months">
        <Card>
          <CompareBars
            items={[
              { label: 'Rain, last 30 days', value: rain30, color: t.series[0] },
              { label: `Usual for ${MONTHS[month - 1]}`, value: normalRain, color: t.axis },
            ]}
            format={(v) => `${whole(v)} mm`}
          />
          <View style={{ marginTop: Spacing.four, gap: 4 }}>
            <Text variant="label" weight="700">
              Soil moisture now
            </Text>
            <LevelGauge value={wet} low={wetNormal - 8} high={Math.min(wetNormal + 8, 99)} domain={[0, 100]} labels={['Drier', 'Normal', 'Wetter']} colors={[t.status.serious, t.status.good, t.series[0]]} />
          </View>
          <View style={{ marginTop: Spacing.four }}>
            <Text variant="label" weight="700" style={{ marginBottom: 8 }}>
              Rain each day (mm)
            </Text>
            <BarChart
              height={110}
              data={recent.map((d, i) => ({ key: d.date, label: i % 30 === 0 ? `${Number(d.date.slice(8))} ${MONTHS[Number(d.date.slice(5, 7)) - 1]}` : '', tipLabel: longDate(d.date), values: [d.rain_mm] }))}
              segments={[{ label: 'Rain', color: t.series[0] }]}
              unit="mm"
            />
          </View>
          <SourceNote>From NASA satellites and weather models, up to {longDate(bundle.field.data_through)}.</SourceNote>
        </Card>
      </Section>
    </Screen>
  );
}

function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text variant="label" weight="700" tone="brand" onPress={onPress} suppressHighlighting>
      {label} ›
    </Text>
  );
}

function Benefit({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.benefitIcon, { backgroundColor: t.status.good + '22' }]}>
        <Icon name={icon} size={15} color={t.status.good} />
      </View>
      <Text variant="label" weight="600" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inner: { padding: 16, borderRadius: 14, marginTop: 14, gap: 10 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  action: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' },
  actionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  benefitIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mini: { height: 170, borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  droneIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
