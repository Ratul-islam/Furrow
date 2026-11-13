import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { HeatGrid } from '@/components/charts/heat-grid';
import { LineChart } from '@/components/charts/line-chart';
import { RangePlot, type RangeRow } from '@/components/charts/range-plot';
import { DataSourcePill } from '@/components/data-source-pill';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/controls';
import { Card, CardHeader, SourceNote } from '@/components/ui/card';
import { Screen, Section } from '@/components/ui/screen';
import { CompareBars, MiniBars, Sparkline } from '@/components/charts/mini';
import { Icon } from '@/components/ui/icon';
import { Insight } from '@/components/ui/insight';
import { Stat, StatRow } from '@/components/ui/stat';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { Patterns } from '@/screens/patterns';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { fixed, MONTH_INITIALS, MONTHS, signed, whole } from '@/lib/format';
import type { Bundle, Future } from '@/lib/types';

type Tab = 'events' | 'patterns' | 'heat' | 'rain' | 'soil' | 'green' | 'future';

type Span = '10' | '20' | 'all';
function bySpan<T>(rows: T[], span: Span) {
  return span === 'all' ? rows : rows.slice(-Number(span));
}

function SpanChips({ value, onChange }: { value: Span; onChange: (s: Span) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {(
        [
          ['10', '10 yrs'],
          ['20', '20 yrs'],
          ['all', 'All'],
        ] as const
      ).map(([v, l]) => (
        <MiniChip key={v} label={l} active={value === v} onPress={() => onChange(v)} />
      ))}
    </View>
  );
}

function MiniChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} hitSlop={6}>
      <View
        style={{
          paddingHorizontal: 10,
          minHeight: 32,
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: active ? t.brand : t.card,
          borderWidth: 1,
          borderColor: active ? t.brand : t.border,
        }}>
        <Text variant="caption" weight="700" style={{ color: active ? '#fff' : t.textSecondary }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function median(xs: number[]) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

export function History() {
  const { bundle } = useData();
  const [tab, setTab] = useState<Tab>('events');
  const years = bundle.climate_annual;
  return (
    <Screen title="History" subtitle={`Your area, ${years[0].year}–${years[years.length - 1].year} · NASA data`} right={<DataSourcePill />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
          { value: 'events', label: 'Events' },
          { value: 'patterns', label: 'Patterns' },
          { value: 'heat', label: 'Heat' },
          { value: 'rain', label: 'Rain' },
          { value: 'soil', label: 'Soil' },
          { value: 'green', label: 'Crops' },
          { value: 'future', label: 'Future' },
        ] as { value: Tab; label: string }[]
        ).map((o) => (
          <Chip key={o.value} active={tab === o.value} onPress={() => setTab(o.value)}>
            {o.label}
          </Chip>
        ))}
      </View>
      {tab === 'events' ? <Events bundle={bundle} /> : null}
      {tab === 'patterns' ? <Patterns bundle={bundle} /> : null}
      {tab === 'heat' ? <Heat bundle={bundle} /> : null}
      {tab === 'rain' ? <Rain bundle={bundle} /> : null}
      {tab === 'soil' ? <Soil bundle={bundle} /> : null}
      {tab === 'green' ? <Green bundle={bundle} /> : null}
      {tab === 'future' ? <FutureView bundle={bundle} /> : null}
    </Screen>
  );
}

function Events({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const a = bundle.climate_annual;
  const brk = bundle.power_notes.break_year;
  const janCold = a.map((y) => bundle.climate_monthly_series.find((m) => m.year === y.year && m.month === 1)?.cold_days ?? 0);
  const top = (vals: number[], n = 3, low = false) =>
    vals
      .map((v, i) => [v, i] as const)
      .sort((x, y) => (low ? x[0] - y[0] : y[0] - x[0]))
      .slice(0, n)
      .map(([, i]) => i);
  const events = [
    { icon: 'flood' as const, color: t.series[0], title: 'Wettest rainy seasons', unit: 'mm, Jul–Sep', vals: a.map((y) => y.rain_jul_sep), idx: top(a.map((y) => y.rain_jul_sep)), say: 'Years like these bring floods to low land.', note: `Rain in the data jumps after ${brk}, so recent years may look wetter than they were.` },
    { icon: 'dry' as const, color: t.series[3], title: 'Driest winters', unit: 'mm, Nov–Apr', vals: a.map((y) => y.rain_nov_apr), idx: top(a.map((y) => y.rain_nov_apr), 3, true), say: 'Dry winters mean more pumping for Boro and wheat.' },
    { icon: 'sun' as const, color: t.series[1], title: 'Hottest springs', unit: 'days ≥35 °C, Mar–Apr', vals: a.map((y) => y.heat_days_mar_apr), idx: top(a.map((y) => y.heat_days_mar_apr)), say: 'Heat at rice flowering leaves empty grains.' },
    { icon: 'rain' as const, color: t.series[0], title: 'Heaviest single-day rain', unit: 'mm in one day', vals: a.map((y) => y.max_day_rain), idx: top(a.map((y) => y.max_day_rain)), say: 'One day like this can wash away fertiliser and seedlings.' },
    { icon: 'cold' as const, color: t.series[0], title: 'Coldest Januaries', unit: 'nights below 15 °C', vals: janCold, idx: top(janCold), say: 'Cold nights slow Boro seedlings.' },
  ];
  return (
    <Section title="Big events in your area">
      <Insight
        icon="history"
        color={t.brand}
        title="30 years of floods, droughts and heat"
        detail="Each bar is one year. The coloured bars are the worst years, so you can see how often bad years come.">
        <Text variant="caption" tone="secondary">
          From NASA POWER weather data for {bundle.field.upazila}, {a[0].year}–{a[a.length - 1].year}.
        </Text>
      </Insight>
      {events.map((e) => (
        <Card key={e.title}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: e.color + '22' }}>
              <Icon name={e.icon} size={18} color={e.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{e.title}</Text>
              <Text variant="caption" tone="secondary">
                {e.idx.map((i) => a[i].year).join(' · ')}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <MiniBars values={e.vals} highlight={e.idx} accent={e.color} height={48} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text variant="caption" tone="muted">
                {a[0].year}
              </Text>
              <Text variant="caption" tone="muted">
                {a[a.length - 1].year}
              </Text>
            </View>
          </View>
          <Text variant="label" weight="700" style={{ marginTop: 8 }}>
            Worst: {whole(e.vals[e.idx[0]])} {e.unit} in {a[e.idx[0]].year}
          </Text>
        </Card>
      ))}
    </Section>
  );
}

function Heat({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const [span, setSpan] = useState<Span>('all');
  const a = bySpan(bundle.climate_annual, span);
  const tr = bundle.trends;
  const brk = bundle.power_notes.break_year;
  const fit = (k: 'tmax' | 'heat_days_mar_apr', y: number) => (y < brk ? tr[k].fit_a + tr[k].fit_b * y : null);
  return (
    <Section title="What has shifted" action={<SpanChips value={span} onChange={setSpan} />}>
      <Insight
        icon="sun"
        color={t.series[1]}
        title={`March–April brings about ${whole(median(a.filter((d) => d.year >= 2001).map((d) => d.heat_days_mar_apr)))} days above ${bundle.thresholds.heat_c} °C`}
        detail={`From ${bundle.power_notes.trend_years} the average temperature here hardly changed. Climate models expect more very hot days from the 2030s (see Future).`}>
        <StatRow>
          <Stat
            label="Change every 10 years"
            count={tr.tmean.per_decade}
            format={(v) => (Math.abs(v) < 0.05 ? 'No change' : `${signed(v, 1)} °C`)}
            viz={<Sparkline values={bundle.climate_annual.filter((d) => d.year < brk).map((d) => d.tmean)} color={t.series[1]} height={36} />}
            hint={`Average temperature, ${bundle.power_notes.trend_years}`}
          />
          <Stat
            label="Very hot days, Mar–Apr"
            count={tr.heat_days_mar_apr.last_decade}
            format={(v) => v.toFixed(1)}
            unit="days"
            viz={
              <CompareBars
                items={[
                  { label: tr.heat_days_mar_apr.first_label, value: tr.heat_days_mar_apr.first_decade, color: t.axis },
                  { label: tr.heat_days_mar_apr.last_label, value: tr.heat_days_mar_apr.last_decade, color: t.series[1] },
                ]}
                format={(v) => v.toFixed(1)}
              />
            }
          />
        </StatRow>
      </Insight>
      <Card>
        <CardHeader title="Daily high temperature" subtitle="Each dot is one year. The dashed line shows the trend." right={<Badge kind="nasa" label="NASA" />} />
        <LineChart
          series={[
            { key: 'tmax', label: 'Average high', color: t.series[1], points: a.map((d) => ({ x: d.year, y: d.tmax })), dots: true },
            { key: 'fit', label: 'Trend', color: t.textSecondary, dashed: true, width: 1.5, points: a.map((d) => ({ x: d.year, y: fit('tmax', d.year) })), hideInTooltip: true },
          ]}
          formatY={(v) => v.toFixed(1)}
          yUnit="°C"
          animateKey={span}
          markers={[{ x: brk - 0.5, label: 'Data change' }]}
        />
        <SourceNote>
          NASA POWER weather, corrected to match local measurements. The data source changed in {brk}, so the trend stops there.
        </SourceNote>
      </Card>
      <Card>
        <CardHeader
          title={`Days ≥ ${bundle.thresholds.heat_c} °C in March–April`}
          subtitle="Boro rice flowers now. Above 35 °C the grains stay empty."
          right={<Badge kind="nasa" label="NASA" />}
        />
        <BarChart
          data={a.map((d, i) => ({ key: String(d.year), label: i % 5 === 0 ? `’${String(d.year).slice(2)}` : '', tipLabel: String(d.year), values: [d.heat_days_mar_apr] }))}
          segments={[{ label: 'Very hot days', color: t.series[1] }]}
          unit="days"
          marker={{ key: String(brk), label: 'Data change' }}
          animateKey={span}
        />
        <SourceNote>Days reaching {bundle.thresholds.heat_c} °C or more, 1 March to 30 April, from NASA POWER.</SourceNote>
      </Card>
    </Section>
  );
}

function Rain({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const tr = bundle.trends;
  const [span, setSpan] = useState<Span>('all');
  const brk = bundle.power_notes.break_year;
  const normals = bundle.climate_monthly;
  const annual = bundle.climate_annual;
  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const before = avg(annual.filter((a) => a.year >= 2001 && a.year < brk).map((a) => a.rain_mm));
  const after = avg(annual.filter((a) => a.year >= brk).map((a) => a.rain_mm));
  const yearTotal = normals.reduce((s, m) => s + m.rain_mm, 0);
  const monsoon = normals.filter((m) => m.month >= 6 && m.month <= 9).reduce((s, m) => s + m.rain_mm, 0);
  const drySeason = normals.filter((m) => m.month >= 11 || m.month <= 4).reduce((s, m) => s + m.rain_mm, 0);
  const byYM = new Map(bundle.climate_monthly_series.map((m) => [`${m.year}-${m.month}`, m]));
  const allYears = Array.from(new Set(bundle.climate_monthly_series.map((m) => m.year))).sort((x, y) => x - y);
  const years = span === 'all' ? allYears : allYears.slice(-Number(span) - 1);
  const rows = years.map((y) => ({
    year: y,
    cells: Array.from({ length: 12 }, (_, i) => {
      const m = byYM.get(`${y}-${i + 1}`);
      const n = normals[i].rain_mm;
      if (!m || m.days < 25 || n < 30) return null;
      return (100 * m.rain_mm) / n;
    }),
  }));
  return (
    <Section title="Rainfall" action={<SpanChips value={span} onChange={setSpan} />}>
      <Insight
        icon="water"
        color={t.series[0]}
        title={`${Math.round((100 * monsoon) / yearTotal)}% of the year's rain falls in June–September`}
        detail={`A normal year brings about ${whole(yearTotal)} mm. The dry season (Nov–Apr) gets ${whole(drySeason)} mm, so Boro needs irrigation.`}>
        <StatRow>
          <Stat
            label={`Rain in the data, before and after ${brk}`}
            count={after - before}
            format={(v) => `+${whole(v)}`}
            unit="mm"
            viz={
              <CompareBars
                items={[
                  { label: `2001–${String(brk - 1).slice(2)}`, value: before, color: t.axis },
                  { label: `${brk}–25`, value: after, color: t.series[0] },
                ]}
                format={(v) => whole(v)}
              />
            }
          />
          <Stat
            label="Longest dry spell, Aman season"
            count={tr.aman_dry_spell.last_decade}
            format={(v) => v.toFixed(0)}
            unit="days"
            viz={
              <CompareBars
                items={[
                  { label: tr.aman_dry_spell.first_label, value: tr.aman_dry_spell.first_decade, color: t.axis },
                  { label: tr.aman_dry_spell.last_label, value: tr.aman_dry_spell.last_decade, color: t.series[3] },
                ]}
                format={(v) => v.toFixed(0)}
              />
            }
          />
        </StatRow>
        <View style={{ marginTop: Spacing.three, padding: 10, borderRadius: 10, backgroundColor: t.demoSoft }}>
          <Text variant="caption" style={{ color: t.demo }}>
            From {brk} the NASA weather data shows about {whole(after - before)} mm more rain a year. This is most likely a change in how the data is made, not real rain, so we do not treat it as a trend. A rain gauge in the field would tell us for sure.
          </Text>
        </View>
      </Insight>
      <Card>
        <CardHeader title="Rain each month" subtitle="Bar: a normal month. Line: the usual range. Dot: this year." right={<Badge kind="nasa" label="NASA" />} />
        <BarChart
          data={normals.map((m) => ({
            key: String(m.month),
            label: MONTH_INITIALS[m.month - 1],
            tipLabel: MONTHS[m.month - 1],
            values: [m.rain_mm],
            range: [m.rain_p20, m.rain_p80],
            dot: m.rain_current,
          }))}
          segments={[{ label: 'Normal', color: t.series[0] }]}
          rangeLabel="Usual range"
          dotLabel="2026"
          unit="mm"
        />
        <SourceNote>NASA POWER rainfall, 2001–2025.</SourceNote>
      </Card>
      <Card>
        <CardHeader title="Every month since 1996" subtitle="Each square is one month. Red = drier than usual, blue = wetter. Tap a square." right={<Badge kind="nasa" label="NASA" />} />
        <HeatGrid
          rows={rows}
          value="Of usual rain"
          domain={[0, 100, 200]}
          formatValue={(v) => `${Math.round(v)}%`}
          lowLabel="Dry"
          highLabel="Wet"
          tipDetail={(y, m) => `${whole(byYM.get(`${y}-${m}`)?.rain_mm)} mm`}
          markYear={{ year: brk, label: 'Data change' }}
          animateKey={span}
        />
        <SourceNote>Dashed line: the {brk} data change. Grey: dry-season months, when almost no rain is normal.</SourceNote>
      </Card>
    </Section>
  );
}

function Soil({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const [span, setSpan] = useState<Span>('all');
  const a = bySpan(bundle.climate_annual, span);
  const tr = bundle.trends;
  const normals = bundle.climate_monthly;
  return (
    <Section title="Soil moisture" action={<SpanChips value={span} onChange={setSpan} />}>
      <Insight
        icon="water"
        color={t.series[2]}
        title={`The root zone dries from ${fixed(Math.max(...normals.map((m) => m.gwet_root)) * 100, 0)}% in the monsoon to ${fixed(Math.min(...normals.map((m) => m.gwet_root)) * 100, 0)}% by spring`}
        detail="Driest in March–April, just when Boro flowers. That is where irrigation water goes.">
        <StatRow>
          <Stat
            label="Dry-season soil water"
            count={tr.gwet_root_dry.per_decade * 100}
            format={(v) => signed(v, 1)}
            unit="per 10 years"
            viz={<Sparkline values={bundle.climate_annual.filter((d) => d.year < bundle.power_notes.break_year).map((d) => d.gwet_root_dry * 100)} color={t.series[3]} height={36} />}
            hint={`Jan–Apr, ${bundle.power_notes.trend_years}`}
          />
          <Stat
            label="Soil water by month"
            count={tr.gwet_root.last_decade * 100}
            format={(v) => v.toFixed(0)}
            unit="% avg"
            viz={<MiniBars values={normals.map((m) => m.gwet_root * 100)} highlight={[2, 3]} accent={t.series[3]} color={t.series[2]} height={36} />}
            hint="January to December; March–April marked"
          />
        </StatRow>
      </Insight>
      <Card>
        <CardHeader title="Water in the soil, every year" subtitle="0 = bone dry, 100 = soaked" right={<Badge kind="nasa" label="NASA" />} />
        <LineChart
          series={[
            { key: 'all', label: 'Whole year', color: t.series[2], points: a.map((d) => ({ x: d.year, y: d.gwet_root * 100 })), dots: true },
            { key: 'dry', label: 'Dry season (Jan–Apr)', color: t.series[3], points: a.map((d) => ({ x: d.year, y: d.gwet_root_dry * 100 })), dots: true },
          ]}
          formatY={(v) => v.toFixed(0)}
          yUnit="%"
          markers={[{ x: bundle.power_notes.break_year - 0.5, label: 'Data change' }]}
          animateKey={span}
        />
        <SourceNote>NASA soil-moisture model, at root depth. The jump in {bundle.power_notes.break_year} comes from the same data change as the rain.</SourceNote>
      </Card>
      <Card>
        <CardHeader title="Soil water through the year" subtitle="A normal year, and this year" />
        <LineChart
          series={[
            { key: 'normal', label: 'Normal year', color: t.series[2], points: normals.map((m) => ({ x: m.month, y: m.gwet_root * 100 })) },
            { key: 'now', label: '2026', color: t.series[1], dots: true, points: normals.map((m) => ({ x: m.month, y: m.gwet_root_current == null ? null : m.gwet_root_current * 100 })) },
          ]}
          xTicks={[1, 3, 5, 7, 9, 11]}
          formatX={(m) => MONTHS[m - 1]}
          formatY={(v) => v.toFixed(0)}
          yUnit="%"
        />
        <SourceNote>The soil dries out from November to April, so Boro needs irrigation then.</SourceNote>
      </Card>
    </Section>
  );
}

function Green({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const c = bundle.ndvi_climatology;
  const peaks = bundle.ndvi_peaks.filter((p) => p.year >= 2001);
  const amanPast = peaks.filter((p) => p.year <= 2025 && p.aman_peak != null).map((p) => p.aman_peak as number);
  const amanNow = peaks.find((p) => p.year === 2026)?.aman_peak ?? null;
  const amanNormal = amanPast.reduce((s, v) => s + v, 0) / amanPast.length;
  const pctBelow = amanNow == null ? 0 : Math.round((100 * amanPast.filter((v) => v < amanNow).length) / amanPast.length);
  const doyLabel = (d: number) => {
    const date = new Date(Date.UTC(2021, 0, d));
    return MONTHS[date.getUTCMonth()];
  };
  return (
    <Section title="Crop health from satellite">
      <Insight
        icon="leaf"
        color={t.series[2]}
        title={amanNow != null ? `This Aman season is greener than only ${pctBelow}% of seasons since 2001` : 'Greenness through the year'}
        detail="The greener the field looks from space, the better the crop is growing.">
        <Sparkline values={peaks.map((p) => p.aman_peak)} color={t.series[2]} baseline={amanNormal} height={44} />
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
          Greenest point of each Aman season, 2001–2026. Dashed line = normal.
        </Text>
      </Insight>
      <Card>
        <CardHeader title="Greenness through the year" subtitle="Green line: a normal year. Orange: this year. Shaded: the usual range." right={<Badge kind="nasa" label="NASA" />} />
        <LineChart
          band={{ label: 'Usual range', color: t.series[2], points: c.map((d) => ({ x: d.doy, lo: d.p10 * 100, hi: d.p90 * 100 })) }}
          series={[
            { key: 'mean', label: 'Normal year', color: t.series[2], points: c.map((d) => ({ x: d.doy, y: d.mean * 100 })) },
            { key: 'cur', label: '2026', color: t.series[1], dots: true, points: c.map((d) => ({ x: d.doy, y: d.current == null ? null : d.current * 100 })) },
          ]}
          xTicks={[1, 91, 182, 274]}
          formatX={doyLabel}
          formatTipX={(d) => `Day ${d} (${doyLabel(d)})`}
          markers={[
            { x: 75, label: 'Boro' },
            { x: 275, label: 'Aman' },
          ]}
          formatY={(v) => v.toFixed(0)}
          yUnit="/ 100"
        />
        <SourceNote>NASA MODIS satellite, a photo of the field every 16 days.</SourceNote>
      </Card>
      <Card>
        <CardHeader title="How green each season got" subtitle="Higher = healthier crop. Gaps = cloudy, no clear photo." />
        <LineChart
          series={[
            { key: 'boro', label: 'Boro season', color: t.series[0], dots: true, points: peaks.map((p) => ({ x: p.year, y: p.boro_peak == null ? null : p.boro_peak * 100 })) },
            { key: 'aman', label: 'Aman season', color: t.series[2], dots: true, points: peaks.map((p) => ({ x: p.year, y: p.aman_peak == null ? null : p.aman_peak * 100 })) },
          ]}
          formatY={(v) => v.toFixed(0)}
          yUnit="/ 100"
        />
        <SourceNote>Two green seasons a year: the satellite confirms this field grows Boro and Aman rice.</SourceNote>
      </Card>
    </Section>
  );
}

const SCEN: { key: string; label: string; scenario: Future['scenario']; horizon: Future['horizon'] }[] = [
  { key: 'obs', label: 'Today', scenario: 'observed', horizon: 'now' },
  { key: '245-30', label: '2030s, medium', scenario: 'ssp245', horizon: '2030s' },
  { key: '585-30', label: '2030s, hot', scenario: 'ssp585', horizon: '2030s' },
  { key: '245-50', label: '2050s, medium', scenario: 'ssp245', horizon: '2050s' },
  { key: '585-50', label: '2050s, hot', scenario: 'ssp585', horizon: '2050s' },
];

function FutureView({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const [scen, setScen] = useState<'both' | 'ssp245' | 'ssp585'>('both');
  const fs = bundle.futures;
  const models = Array.from(new Set(fs.filter((f) => f.scenario !== 'observed').map((f) => f.model)));
  if (models.length === 0) {
    return (
      <Card>
        <Text>Future climate data is still loading. Check back soon.</Text>
      </Card>
    );
  }
  const rowsFor = (pick: (f: Future) => number, keep: (f: Future) => boolean = () => true): RangeRow[] =>
    SCEN.filter((s) => scen === 'both' || s.scenario === 'observed' || s.scenario === scen).map((s, i) => {
      const vals = fs.filter((f) => f.scenario === s.scenario && f.horizon === s.horizon && keep(f)).map(pick);
      return {
        key: s.key,
        label: s.label,
        min: Math.min(...vals),
        max: Math.max(...vals),
        point: median(vals),
        color: i === 0 ? t.textSecondary : s.scenario === 'ssp245' ? t.series[0] : t.series[1],
        emphasis: i === 0,
      };
    }).filter((r) => Number.isFinite(r.min));
  const heat = (f: Future) => f.monthly[2].heat_days + f.monthly[3].heat_days;
  const boroEt = (f: Future) => [0, 1, 2, 3, 4].reduce((s, i) => s + f.monthly[i].et0_mm, 0);
  const monsoon = (f: Future) => [5, 6, 7, 8].reduce((s, i) => s + f.monthly[i].rain_mm, 0);
  const obs = fs[0];
  const rainModels = Array.from(new Set(fs.filter((f) => f.scenario !== 'observed' && f.has_rain_change !== false).map((f) => f.model)));
  return (
    <Section
      title="The next 30 years"
      action={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(
            [
              ['both', 'Both'],
              ['ssp245', 'Medium'],
              ['ssp585', 'Hot'],
            ] as const
          ).map(([v, l]) => (
            <MiniChip key={v} label={l} active={scen === v} onPress={() => setScen(v)} />
          ))}
        </View>
      }>
      <Insight
        icon="climate"
        color={t.series[1]}
        title={`Hot days in March–April: about ${whole(heat(obs))} now, ${whole(median(fs.filter((f) => f.scenario === 'ssp245' && f.horizon === '2050s').map(heat)))} by the 2050s`}
        detail="Medium future: the world cuts pollution somewhat. Hot future: pollution keeps rising. The models disagree, so we show a range.">
        <MiniBars
          values={[heat(obs), ...SCEN.slice(1).map((s) => median(fs.filter((f) => f.scenario === s.scenario && f.horizon === s.horizon).map(heat)) || 0)]}
          highlight={[1, 2, 3, 4]}
          color={t.textSecondary}
          accent={t.series[1]}
          height={40}
        />
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
          Today, then the 2030s and 2050s in a medium and a hot future
        </Text>
      </Insight>
      <Card>
        <CardHeader
          title="Hot days in March–April"
          subtitle="When Boro flowers. Dot = middle answer of the models; bar = lowest to highest."
          right={<Badge kind="nasa" label="NASA" />}
        />
        <RangePlot animateKey={scen} rows={rowsFor(heat)} format={(v) => v.toFixed(0)} pointLabel="Middle answer" rangeLabel="Lowest to highest" labelWidth={118} />
        <View style={{ marginTop: Spacing.two }}>
          <Text variant="caption" tone="secondary">
            Today about {fixed(heat(obs), 0)} very hot days in March–April.
          </Text>
        </View>
      </Card>
      <Card>
        <CardHeader title="Water the field loses, Jan–May" subtitle="To sun and wind in the Boro season (mm). More = more irrigation." right={<Badge kind="nasa" label="NASA" />} />
        <RangePlot animateKey={scen} rows={rowsFor(boroEt)} format={(v) => whole(v)} pointLabel="Middle answer" rangeLabel="Lowest to highest" labelWidth={118} />
      </Card>
      <Card>
        <CardHeader title="Monsoon rain, Jun–Sep" subtitle="Rain in the Aman season (mm)" right={<Badge kind="nasa" label="NASA" />} />
        <RangePlot animateKey={scen} rows={rowsFor(monsoon, (f) => f.has_rain_change !== false)} format={(v) => whole(v)} pointLabel="Middle answer" rangeLabel="Lowest to highest" labelWidth={118} />
        <SourceNote>
          NASA climate models ({models.join(', ')}). We used a small sample of years, so read these as the direction things are going, not exact numbers. Rain changes come from {rainModels.join(', ') || 'no model yet'} only.
        </SourceNote>
      </Card>
    </Section>
  );
}
