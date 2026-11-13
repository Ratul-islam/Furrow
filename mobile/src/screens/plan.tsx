import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { CompareBars } from '@/components/charts/mini';
import { Insight } from '@/components/ui/insight';
import Animated from 'react-native-reanimated';
import { useEntrance } from '@/lib/motion';
import { DataSourcePill } from '@/components/data-source-pill';
import { WindowStrip } from '@/components/farmer';
import { FamilyLegend, RotationStrip, SEASON_MONTHS } from '@/components/rotation-strip';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, SourceNote } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen, Section } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { planTasks, type PlanTask } from '@/lib/engine';
import { bdt, dateRange, fixed, MONTH_INITIALS, monthDay, signed, whole } from '@/lib/format';

const KIND_ICON: Record<PlanTask['kind'], IconName> = {
  prepare: 'sprout',
  sow: 'leaf',
  transplant: 'sprout',
  watch: 'warning',
  harvest: 'harvest',
};

export function Plan() {
  const t = useTheme();
  const { bundle, evaluation } = useData();
  const { recommended: rec, current: cur, cropIndex } = evaluation;
  const win = bundle.boro_window;
  const tasks = planTasks(rec.rotation, cropIndex, win.window);
  const inWindow = (mmdd: string) => {
    const order = (s: string) => {
      const [m, d] = s.split('-').map(Number);
      return (m >= 11 ? m - 12 : m) * 100 + d;
    };
    return order(mmdd) >= order(win.window[0]) && order(mmdd) <= order(win.window[1]);
  };
  const hasBoro = rec.rotation.slots.some((s) => s.crop.includes('boro'));

  const deltas = [
    { label: 'Irrigation water', a: cur.water.observed, b: rec.water.observed, fmt: (v: number) => `${whole(v)} mm`, change: rec.water.observed - cur.water.observed, unit: 'mm', lowerBetter: true },
    { label: 'Bad-weather days at flowering', a: cur.stress.observed, b: rec.stress.observed, fmt: (v: number) => `${fixed(v, 1)} days`, change: rec.stress.observed - cur.stress.observed, unit: 'days', lowerBetter: true },
    { label: 'Soil health', a: cur.soil.score, b: rec.soil.score, fmt: (v: number) => `${Math.round(v)} / 100`, change: rec.soil.score - cur.soil.score, unit: 'pts', lowerBetter: false },
    { label: 'Profit (example prices)', a: cur.income.observed, b: rec.income.observed, fmt: bdt, change: (rec.income.observed - cur.income.observed) / 1000, unit: 'k ৳', lowerBetter: false },
  ];
  const next = tasks[0];

  return (
    <Screen title="To-do" subtitle="Farm year Nov 2026 – Oct 2027" right={<DataSourcePill />}>
      <Insight icon="schedule" color={t.brand} title={`Next: ${next.title}, ${dateRange(next.start, next.end)}`} detail={next.note || undefined}>
        <MonthTrack start={next.start} end={next.end} color={t.brand} index={0} showMonths />
      </Insight>
      <Card>
        <CardHeader title="This year and next year" subtitle="The farm year starts in November, after the Aman harvest" />
        <Text variant="caption" tone="muted" style={{ marginBottom: 4 }}>
          This year · {cur.rotation.name.replaceAll(' – ', ' → ')}
        </Text>
        <RotationStrip rotation={cur.rotation} crops={cropIndex} />
        <Text variant="caption" tone="muted" style={{ marginTop: 12, marginBottom: 4 }}>
          Next year · {rec.rotation.name.replaceAll(' – ', ' → ')}
        </Text>
        <RotationStrip rotation={rec.rotation} crops={cropIndex} showMonths />
        <View style={{ marginTop: 12 }}>
          <FamilyLegend />
        </View>
      </Card>

      <Section title="What changes if you switch">
        <Card padded={false}>
          {deltas.map((d, i) => {
            const good = d.change === 0 ? true : d.lowerBetter ? d.change < 0 : d.change > 0;
            return (
              <View key={d.label} style={[styles.deltaRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text variant="label" weight="700">
                    {d.label}
                  </Text>
                  <CompareBars
                    items={[
                      { label: 'This year', value: d.a, color: t.series[1] },
                      { label: 'Next year', value: d.b, color: t.series[0] },
                    ]}
                    format={d.fmt}
                  />
                </View>
                <View style={[styles.chip, { backgroundColor: (good ? t.status.good : t.status.serious) + '22' }]}>
                  <Icon name={good ? 'check' : 'warning'} size={12} color={good ? t.status.good : t.status.serious} />
                  <Text variant="caption" weight="700">
                    {signed(d.change, d.unit === 'days' ? 1 : 0)} {d.unit}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <SourceNote>
              With today&apos;s weather. In hotter or drier future years the new plan needs {whole(rec.water.min)}–{whole(rec.water.max)} mm of irrigation.
            </SourceNote>
          </View>
        </Card>
      </Section>

      <Section title={hasBoro ? 'Best time to plant Boro' : 'If you keep growing Boro'}>
        <Card>
          <CardHeader
            title={`Plant between ${monthDay(win.window[0])} and ${monthDay(win.window[1])}`}
            subtitle="Each bar is a planting date. Taller bar = more risk of too-cold or too-hot days when the rice flowers."
            right={<Badge kind="nasa" label="NASA" />}
          />
          <WindowStrip rows={win.rows} window={win.window} best={win.best} />
          <View style={{ height: 16 }} />
          <BarChart
            data={win.rows.map((r, i) => ({
              key: r.transplant,
              label: i % 3 === 0 ? monthDay(r.transplant) : '',
              tipLabel: `Plant on ${monthDay(r.transplant)}`,
              values: [r.cold_days, r.heat_days],
              highlight: inWindow(r.transplant),
            }))}
            segments={[
              { label: 'Too cold (below 15 °C)', color: t.series[0] },
              { label: 'Too hot (35 °C or more)', color: t.series[1] },
            ]}
            dimOthers
            unit="days"
            formatY={(v) => (v < 10 ? v.toFixed(1) : v.toFixed(0))}
          />
          <SourceNote>
            From 15 years of NASA weather. Plant too early and the rice flowers in the cold; too late and it flowers in the April heat. Dark bars: the best dates.
          </SourceNote>
        </Card>
      </Section>

      <Section title="Season timeline">
        <Card padded={false}>
          <View style={[styles.monthHead, { borderBottomColor: t.border }]}>
            <View style={{ width: 30 }} />
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {SEASON_MONTHS.map((m) => (
                <Text key={m} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center' }}>
                  {MONTH_INITIALS[m - 1]}
                </Text>
              ))}
            </View>
          </View>
          {tasks.map((task, i) => (
            <View key={task.title + task.start} style={[styles.task, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
              <View style={[styles.taskIcon, { backgroundColor: task.kind === 'watch' ? t.status.warning + '2a' : t.brandSoft }]}>
                <Icon name={KIND_ICON[task.kind]} size={15} color={task.kind === 'watch' ? t.demo : t.brand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  <Text variant="label" weight="600" style={{ flex: 1 }}>
                    {task.title}
                  </Text>
                  <Text variant="caption" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                    {dateRange(task.start, task.end)}
                  </Text>
                </View>
                <MonthTrack start={task.start} end={task.end} color={task.kind === 'watch' ? t.status.warning : t.brand} index={i} />

              </View>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deltaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  task: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  monthHead: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  taskIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

/** Where a task falls in the farm year (Nov → Oct): a bar on a 12-month track. */
function MonthTrack({ start, end, color, index, showMonths }: { start: string; end?: string; color: string; index: number; showMonths?: boolean }) {
  const t = useTheme();
  const entrance = useEntrance(index + 2, 'fade');
  const frac = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    const mi = SEASON_MONTHS.indexOf(m);
    return (mi + (d - 1) / 30) / 12;
  };
  const a = frac(start);
  const b = Math.max(frac(end ?? start) + 1 / 36, a + 1 / 36);
  return (
    <View>
      <View style={[styles.track, { backgroundColor: t.cardMuted }]}>
        <Animated.View style={[entrance, { position: 'absolute', left: `${a * 100}%`, width: `${(b - a) * 100}%`, top: 0, bottom: 0, borderRadius: 4, backgroundColor: color }]} />
      </View>
      {showMonths ? (
        <View style={{ flexDirection: 'row' }}>
          {SEASON_MONTHS.map((m) => (
            <Text key={m} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center' }}>
              {MONTH_INITIALS[m - 1]}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
