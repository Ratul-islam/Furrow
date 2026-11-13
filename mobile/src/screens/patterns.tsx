/**
 * Patterns: every repeating or linked pattern in the field's NASA data, shown as a picture.
 *  1. The farming year: rain, heat, soil water and greenness by month on one shared axis,
 *     with the crop calendar underneath (tap a month)
 *  2. Greenness calendar: MODIS greenness for every 16 days of every year
 *  3. Heat calendar: hot days per month for every year
 *  4. How weather shapes the crop: scatter plots with a plain-words verdict
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HeatGrid } from '@/components/charts/heat-grid';
import { useWidth } from '@/components/charts/kit';
import { MiniBars } from '@/components/charts/mini';
import { pearson, Scatter } from '@/components/charts/scatter';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, SourceNote } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Insight } from '@/components/ui/insight';
import { Section } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { monthsOf } from '@/lib/engine';
import { MONTH_INITIALS, MONTHS, whole } from '@/lib/format';
import { useEntrance } from '@/lib/motion';
import type { Bundle, CropFamily } from '@/lib/types';

const HEAT_RAMP_LIGHT = ['#fbf1ea', '#f8d6c3', '#f3b391', '#ec8d5f', '#e06a36', '#bf5121', '#943d17'] as const;
const HEAT_RAMP_DARK = ['#2a211c', '#4a2c1f', '#6e3a22', '#954a26', '#bf5c2b', '#e07a45', '#f2a477'] as const;

export function Patterns({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  return (
    <Section title="Patterns in 30 years of data">
      <Insight
        icon="grid"
        color={t.brand}
        title="The same rhythm, year after year"
        detail="Each picture below shows a pattern in your area's NASA data: when rain and heat come, when the field is green, and how the weather changes the harvest."
      />
      <FarmingYear bundle={bundle} />
      <GreennessCalendar bundle={bundle} />
      <HeatCalendar bundle={bundle} />
      <WeatherVsCrop bundle={bundle} />
    </Section>
  );
}

// ----------------------------------------------------------------------------- 1. farming year

function FarmingYear({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const { evaluation } = useData();
  const { width, onLayout } = useWidth(300);
  const [sel, setSel] = useState<number | null>(null);
  const m = bundle.climate_monthly;
  const greenByMonth = Array.from({ length: 12 }, (_, i) => {
    const rows = bundle.ndvi_climatology.filter((d) => new Date(Date.UTC(2021, 0, d.doy)).getUTCMonth() === i);
    return rows.length ? rows.reduce((s, d) => s + d.mean, 0) / rows.length : 0;
  });
  const rows: { key: string; label: string; icon: IconName; color: string; values: number[]; fmt: (v: number) => string; hi: number[] }[] = [
    { key: 'rain', label: 'Rain', icon: 'rain', color: t.series[0], values: m.map((x) => x.rain_mm), fmt: (v) => `${whole(v)} mm`, hi: [5, 6, 7, 8] },
    { key: 'heat', label: 'Hot days', icon: 'sun', color: t.series[1], values: m.map((x) => x.heat_days), fmt: (v) => `${v.toFixed(1)} days`, hi: [2, 3, 4] },
    { key: 'soil', label: 'Soil water', icon: 'water', color: t.series[2], values: m.map((x) => x.gwet_root * 100), fmt: (v) => `${whole(v)} / 100`, hi: [6, 7, 8, 9] },
    { key: 'green', label: 'Greenness', icon: 'leaf', color: t.series[2], values: greenByMonth.map((v) => v * 100), fmt: (v) => `${whole(v)} / 100`, hi: [2, 9] },
  ];
  const rot = evaluation.current.rotation;
  const cropAt = (month: number) => {
    const slot = rot.slots.find((s) => monthsOf(s).includes(month));
    return slot ? evaluation.cropIndex[slot.crop] : null;
  };
  const labelW = 98;
  const barsW = Math.max(width - labelW, 120);
  const gap = 2.5;
  const colW = (barsW - gap * 11) / 12;

  return (
    <Card>
      <CardHeader title="The farming year" subtitle="Weather and crop month by month, on one line. Tap a month." right={<Badge kind="nasa" label="NASA" />} />
      <View onLayout={onLayout}>
        {rows.map((r) => (
          <View key={r.key} style={styles.yearRow}>
            <View style={[styles.yearLabel, { width: labelW }]}>
              <Icon name={r.icon} size={14} color={r.color} />
              <Text variant="caption" weight="600">
                {r.label}
              </Text>
            </View>
            <View style={{ width: barsW }}>
              <MiniBars values={r.values} highlight={r.hi} accent={r.color} color={t.axis} height={34} />
            </View>
          </View>
        ))}
        {/* crop calendar, same 12 columns */}
        <View style={styles.yearRow}>
          <View style={[styles.yearLabel, { width: labelW }]}>
            <Icon name="sprout" size={14} color={t.brand} />
            <Text variant="caption" weight="600">
              Your crops
            </Text>
          </View>
          <View style={{ width: barsW, flexDirection: 'row', gap }}>
            {MONTH_INITIALS.map((_, mi) => {
              const c = cropAt(mi + 1);
              return <View key={mi} style={{ width: colW, height: 18, borderRadius: 4, backgroundColor: c ? t.family[c.family as CropFamily] : t.family.fallow }} />;
            })}
          </View>
        </View>
        <View style={[styles.yearRow, { marginBottom: 0 }]}>
          <View style={{ width: labelW }} />
          <View style={{ width: barsW, flexDirection: 'row', gap }}>
            {MONTH_INITIALS.map((mo, mi) => (
              <Text key={mi} variant="caption" weight={sel === mi ? '700' : '400'} tone={sel === mi ? 'primary' : 'muted'} style={{ width: colW, textAlign: 'center' }}>
                {mo}
              </Text>
            ))}
          </View>
        </View>
        {/* tap targets + selected column highlight, over the bars */}
        <View style={[StyleSheet.absoluteFill, { left: labelW, flexDirection: 'row', gap }]}>
          {MONTH_INITIALS.map((_, mi) => (
            <Pressable
              key={mi}
              accessibilityLabel={`Show ${MONTHS[mi]}`}
              onPress={() => setSel(sel === mi ? null : mi)}
              style={{ width: colW, borderRadius: 6, backgroundColor: sel === mi ? t.brand + '1f' : 'transparent', borderWidth: sel === mi ? 1.5 : 0, borderColor: t.brand }}
            />
          ))}
        </View>
      </View>
      {sel != null ? (
        <MonthCard
          key={sel}
          title={`${MONTHS[sel]} · ${cropAt(sel + 1)?.name ?? 'No crop (fallow)'}`}
          items={rows.map((r) => ({ icon: r.icon, color: r.color, label: r.label, value: r.fmt(r.values[sel]) }))}
        />
      ) : (
        <Text variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          Tap a month
        </Text>
      )}
      <SourceNote>Monthly normals 2001–2025: NASA POWER (rain, heat, soil water) and NASA MODIS (greenness).</SourceNote>
    </Card>
  );
}

function MonthCard({ title, items }: { title: string; items: { icon: IconName; color: string; label: string; value: string }[] }) {
  const t = useTheme();
  const e = useEntrance(0);
  return (
    <Animated.View style={[{ marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: t.cardMuted, gap: 8 }, e]}>
      <Text variant="label" weight="700">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
        {items.map((x) => (
          <View key={x.label} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={x.icon} size={14} color={x.color} />
            <Text variant="caption" tone="secondary">
              {x.label}
            </Text>
            <Text variant="caption" weight="700">
              {x.value}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------------- 2. greenness calendar

function GreennessCalendar({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const slots = Array.from(new Set(bundle.ndvi.map((d) => dayOfYear(d.date)))).sort((a, b) => a - b);
  const years = Array.from(new Set(bundle.ndvi.map((d) => Number(d.date.slice(0, 4))))).filter((y) => y >= 2001).sort((a, b) => a - b);
  const byKey = new Map(bundle.ndvi.map((d) => [`${d.date.slice(0, 4)}-${dayOfYear(d.date)}`, d]));
  const rows = years.map((y) => ({
    year: y,
    cells: slots.map((s) => {
      const d = byKey.get(`${y}-${s}`);
      return d && d.reliability <= 1 ? d.ndvi * 100 : null;
    }),
  }));
  const monthOf = (doy: number) => new Date(Date.UTC(2021, 0, doy)).getUTCMonth();
  const cols = slots.map((sl, i) => (i === 0 || monthOf(sl) !== monthOf(slots[i - 1]) ? MONTH_INITIALS[monthOf(sl)] : ''));
  return (
    <Card>
      <CardHeader title="Greenness calendar" subtitle="Every 16 days since 2001. Dark green = full crop. Two green bands a year = Boro and Aman." right={<Badge kind="nasa" label="NASA" />} />
      <HeatGrid
        rows={rows}
        value="Greenness"
        domain={[25, 50, 85]}
        ramp={t.canopy}
        cols={cols}
        colTitle={(c) => {
          const d = new Date(Date.UTC(2021, 0, slots[c]));
          return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
        }}
        formatValue={(v) => `${Math.round(v)} / 100`}
        lowLabel="Bare / water"
        highLabel="Full crop"
      />
      <SourceNote>NASA MODIS MOD13Q1, 250 m. Grey squares: cloud hid the field. Look down a column to see a season arriving earlier or later.</SourceNote>
    </Card>
  );
}

function dayOfYear(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  return Math.round((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
}

// ----------------------------------------------------------------------------- 3. heat calendar

function HeatCalendar({ bundle }: { bundle: Bundle }) {
  const dark = useIsDark();
  const years = Array.from(new Set(bundle.climate_monthly_series.map((m) => m.year))).sort((a, b) => a - b);
  const byYM = new Map(bundle.climate_monthly_series.map((m) => [`${m.year}-${m.month}`, m]));
  const rows = years.map((y) => ({ year: y, cells: Array.from({ length: 12 }, (_, i) => byYM.get(`${y}-${i + 1}`)?.heat_days ?? null) }));
  return (
    <Card>
      <CardHeader title="Heat calendar" subtitle="Days of 35 °C or more, each month of each year. Darker = hotter." right={<Badge kind="nasa" label="NASA" />} />
      <HeatGrid
        rows={rows}
        value="Hot days"
        domain={[0, 6, 18]}
        ramp={dark ? HEAT_RAMP_DARK : HEAT_RAMP_LIGHT}
        formatValue={(v) => `${Math.round(v)} days`}
        lowLabel="None"
        highLabel="18+ days"
        markYear={{ year: bundle.power_notes.break_year, label: 'Data change' }}
      />
      <SourceNote>NASA POWER, corrected to local measurements. The heat sits in March–May every year; the dashed line is the {bundle.power_notes.break_year} data change.</SourceNote>
    </Card>
  );
}

// ----------------------------------------------------------------------------- 4. weather vs crop

function WeatherVsCrop({ bundle }: { bundle: Bundle }) {
  const t = useTheme();
  const peaks = new Map(bundle.ndvi_peaks.map((p) => [p.year, p]));
  const yrs = bundle.climate_annual.filter((a) => a.year >= 2001);
  const pairs = [
    {
      key: 'aman-rain',
      title: 'Rainy-season rain → Aman greenness',
      x: 'Rain, Jul–Sep (mm)',
      fmtX: (v: number) => whole(v),
      points: yrs.flatMap((a) => (peaks.get(a.year)?.aman_peak != null ? [{ key: String(a.year), x: a.rain_jul_sep, y: (peaks.get(a.year)!.aman_peak as number) * 100, label: String(a.year) }] : [])),
      more: 'more rain',
      note: `Rain data jumps after ${bundle.power_notes.break_year}; read this link with care.`,
      color: t.series[0],
    },
    {
      key: 'boro-heat',
      title: 'Spring heat → Boro greenness',
      x: 'Hot days, Mar–Apr',
      fmtX: (v: number) => whole(v),
      points: yrs.flatMap((a) => (peaks.get(a.year)?.boro_peak != null ? [{ key: String(a.year), x: a.heat_days_mar_apr, y: (peaks.get(a.year)!.boro_peak as number) * 100, label: String(a.year) }] : [])),
      more: 'more heat',
      color: t.series[1],
    },
    {
      key: 'boro-dry',
      title: 'Dry-season soil water → Boro greenness',
      x: 'Soil water, Jan–Apr (0–100)',
      fmtX: (v: number) => whole(v),
      points: yrs.flatMap((a) => (peaks.get(a.year)?.boro_peak != null ? [{ key: String(a.year), x: a.gwet_root_dry * 100, y: (peaks.get(a.year)!.boro_peak as number) * 100, label: String(a.year) }] : [])),
      more: 'wetter soil',
      color: t.series[2],
    },
  ];
  return (
    <>
      {pairs.map((p) => {
        const r = pearson(
          p.points.map((q) => q.x),
          p.points.map((q) => q.y),
        );
        const strength = Math.abs(r) < 0.2 ? 'no clear' : Math.abs(r) < 0.4 ? 'a weak' : 'a clear';
        const dir = r >= 0 ? 'greener' : 'less green';
        const sorted = [...p.points].sort((a, b) => a.y - b.y);
        const labelKeys = [sorted[0]?.key, sorted[sorted.length - 1]?.key].filter(Boolean) as string[];
        return (
          <Card key={p.key}>
            <CardHeader title={p.title} subtitle="One dot per year. The dashed line shows the trend." right={<Badge kind="nasa" label="NASA" />} />
            <Scatter points={p.points} xLabel={p.x} yLabel="Peak greenness (0–100)" formatX={p.fmtX} formatY={(v) => whole(v)} labelKeys={labelKeys} color={p.color} height={210} />
            <View style={[styles.verdict, { backgroundColor: t.cardMuted }]}>
              <Text variant="label" weight="700">
                {strength === 'no clear' ? `No clear link (r = ${r.toFixed(2)})` : `${strength[0].toUpperCase()}${strength.slice(1)} link: ${p.more} → ${dir} crop (r = ${r.toFixed(2)})`}
              </Text>

            </View>
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  yearLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verdict: { marginTop: 12, padding: 12, borderRadius: 12, gap: 4 },
});
