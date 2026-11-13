/**
 * Warnings for the farmer's field. Three kinds of evidence, always labelled:
 *  - 'now'      recent NASA data (last 30–90 days)
 *  - 'season'   what usually happens in this area (30 years of NASA data) + climate models
 *  - 'forecast' next 7 days (Open-Meteo, not NASA), only when it loads
 *  - 'you'      what the farmer told us
 */

import { answerOf, answersOf, type Answers } from './questions';
import type { Bundle } from './types';

export type AlertKind = 'drought' | 'flood' | 'heat' | 'heavy_rain' | 'cold' | 'dry_spell' | 'waterlogging' | 'pests';
export type Level = 'serious' | 'warning' | 'good';

export type FieldAlert = {
  id: string;
  kind: AlertKind;
  level: Level;
  source: 'now' | 'season' | 'forecast' | 'you';
  title: string;
  when: string;
  /** the headline number, 0–100 */
  risk: number;
  /** what the % means, in a few words, e.g. "of years" */
  riskText: string;
  /** optional future value of the same risk (climate models) */
  future?: { risk: number; label: string };
  /** one short line: why */
  why: string;
  /** one short line: what to do */
  action: string;
  months?: number[];
  highlight?: number[];
  compare?: { label: string; value: number; unit: string }[];
  years?: { values: number[]; highlight: number[]; from: number; to: number; label: string };
};

export type Forecast = { days: { date: string; tmax: number; rain: number; rainProb: number }[] };

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=Asia%2FDhaka&forecast_days=7`;
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j.daily;
    return {
      days: d.time.map((t: string, i: number) => ({
        date: t,
        tmax: d.temperature_2m_max[i],
        rain: d.precipitation_sum[i],
        rainProb: d.precipitation_probability_max?.[i] ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

const RANK: Record<Level, number> = { serious: 0, warning: 1, good: 2 };

const levelOf = (risk: number): Level => (risk >= 50 ? 'serious' : risk >= 25 ? 'warning' : 'good');
const pctOf = (xs: boolean[]) => (xs.length ? Math.round((100 * xs.filter(Boolean).length) / xs.length) : 0);

export function buildAlerts(b: Bundle, a: Answers | null, forecast: Forecast | null): FieldAlert[] {
  const out: FieldAlert[] = [];
  const m = b.climate_monthly;
  const recent = b.climate_recent;
  const last = recent[recent.length - 1];
  const month = Number(last.date.slice(5, 7));
  const rain30 = recent.slice(-30).reduce((s, d) => s + d.rain_mm, 0);
  const normal = m[month - 1].rain_mm;
  const years = b.climate_annual.filter((y) => y.year >= 2001 && y.year <= 2025);
  const allYears = b.climate_annual;
  const span = { from: allYears[0].year, to: allYears[allYears.length - 1].year };
  const problems = a ? answersOf(a, 'problems') : [];
  const irrigation = a ? answerOf(a, 'irrigation') : undefined;

  // ---- this week (forecast)
  if (forecast) {
    const wet = forecast.days.filter((d) => d.rain >= 20);
    if (wet.length) {
      const risk = Math.max(...wet.map((d) => d.rainProb || 60));
      const big = Math.max(...wet.map((d) => d.rain));
      out.push({ id: 'fc-rain', kind: 'heavy_rain', level: big >= 50 ? 'serious' : levelOf(risk), source: 'forecast', title: 'Heavy rain this week', when: wet.map((d) => d.date.slice(8)).join(', ') + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(wet[0].date.slice(5, 7)) - 1], risk, riskText: 'chance', why: `Up to ${Math.round(big)} mm in a day`, action: 'Clear drains. Hold fertiliser until after the rain.' });
    }
    const hot = forecast.days.filter((d) => d.tmax >= 35);
    if (hot.length) {
      const risk = Math.round((100 * hot.length) / forecast.days.length);
      out.push({ id: 'fc-heat', kind: 'heat', level: levelOf(risk), source: 'forecast', title: 'Hot days this week', when: 'Next 7 days', risk, riskText: 'of days', why: `Up to ${Math.round(Math.max(...hot.map((d) => d.tmax)))} °C`, action: 'Keep water in rice; water crops early or late.' });
    }
  }

  // ---- soil drying now
  const sameMonth = b.climate_monthly_series.filter((x) => x.month === month && x.year >= 2001 && x.year <= 2025).map((x) => x.gwet_root);
  const drierThan = pctOf(sameMonth.map((v) => v > last.gwet_root));
  if (drierThan >= 60) {
    const risk = Math.min(drierThan, 99);
    out.push({
      id: 'drought-now',
      kind: 'drought',
      level: irrigation === 'none' ? 'serious' : levelOf(risk),
      source: 'now',
      title: 'Soil is drying',
      when: 'Now',
      risk,
      riskText: 'of years wetter',
      why: `${Math.round(rain30)} mm rain in 30 days, usually ${Math.round(normal)}`,
      action: irrigation === 'none' ? 'Sow low-water crops now: mustard, lentil.' : 'Water lightly before sowing winter crops.',
      compare: [
        { label: 'Last 30 days', value: rain30, unit: 'mm' },
        { label: 'Usual', value: normal, unit: 'mm' },
      ],
    });
  }

  // ---- hot spring (flowering)
  const heat = b.predictions.find((p) => p.id === 'heat-mar-apr-2027');
  const shift = (heat?.detail.shift as number) ?? 0;
  const heatNow = pctOf(years.map((y) => y.heat_days_mar_apr >= 20));
  const heatFuture = pctOf(years.map((y) => y.heat_days_mar_apr + shift >= 20));
  out.push({
    id: 'heat-season',
    kind: 'heat',
    level: levelOf(Math.max(heatNow, heatFuture)),
    source: 'season',
    title: 'Hot spring',
    when: 'Mar–Apr, Boro flowering',
    risk: heatNow,
    riskText: 'of years',
    future: { risk: heatFuture, label: '2030s' },
    why: '20+ days above 35 °C empty the rice grains',
    action: `Plant Boro by ${b.boro_window.window[1].split('-').reverse().join('/')} so it flowers before the heat.`,
    years: { values: allYears.map((y) => y.heat_days_mar_apr), highlight: allYears.map((y, i) => (y.heat_days_mar_apr >= 20 ? i : -1)).filter((i) => i >= 0), ...span, label: 'Hot days in Mar–Apr, each year' },
  });

  // ---- flood
  const flood = a ? answerOf(a, 'flood') : undefined;
  const monsoonNormal = avg(years.map((y) => y.rain_jul_sep));
  const wetData = pctOf(years.map((y) => y.rain_jul_sep > 1.25 * monsoonNormal));
  const fromAnswer: Record<string, number> = { never: 5, some: 35, most: 70, every: 90 };
  const floodRisk = flood ? fromAnswer[flood] : wetData;
  out.push({
    id: 'flood-season',
    kind: 'flood',
    level: levelOf(floodRisk),
    source: flood ? 'you' : 'season',
    title: 'Flood',
    when: 'Jul–Sep, Aman season',
    risk: floodRisk,
    riskText: flood ? 'your field, from your answer' : 'of years',
    why: `Very wet rainy season in ${wetData}% of years here`,
    action: floodRisk >= 25 ? 'Plant BRRI dhan51/52: they survive 2 weeks under water.' : 'Keep drains clear before July.',
    years: { values: allYears.map((y) => y.rain_jul_sep), highlight: allYears.map((y, i) => (y.rain_jul_sep > 1.25 * monsoonNormal ? i : -1)).filter((i) => i >= 0), ...span, label: 'Rainy-season rain, each year' },
  });

  // ---- 100 mm day
  const bigRain = pctOf(years.map((y) => y.max_day_rain >= 100));
  out.push({
    id: 'heavy-rain',
    kind: 'heavy_rain',
    level: problems.includes('heavy_rain') ? 'warning' : levelOf(bigRain),
    source: 'season',
    title: 'Very heavy rain day',
    when: 'May–Oct',
    risk: bigRain,
    riskText: 'of years',
    why: '100 mm in a day washes away fertiliser',
    action: 'Split urea into small doses.',
    years: { values: allYears.map((y) => y.max_day_rain), highlight: allYears.map((y, i) => (y.max_day_rain >= 100 ? i : -1)).filter((i) => i >= 0), ...span, label: 'Wettest day of each year (mm)' },
  });

  // ---- dry spell in the rainy season
  const spell = pctOf(years.map((y) => y.aman_dry_spell >= 10));
  out.push({
    id: 'dry-spell',
    kind: 'dry_spell',
    level: problems.includes('drought') ? 'warning' : levelOf(spell),
    source: 'season',
    title: 'Dry spell in Aman',
    when: 'Aug–Oct',
    risk: spell,
    riskText: 'of years',
    why: '10+ days without rain stress flowering rice',
    action: irrigation && irrigation !== 'none' ? 'Keep the pump ready in October.' : 'Plant Aman on time in July.',
    years: { values: allYears.map((y) => y.aman_dry_spell), highlight: allYears.map((y, i) => (y.aman_dry_spell >= 10 ? i : -1)).filter((i) => i >= 0), ...span, label: 'Longest dry spell, Jul–Oct (days)' },
  });

  // ---- cold at early Boro flowering (February)
  const feb = b.climate_monthly_series.filter((x) => x.month === 2 && x.year >= 2001 && x.year <= 2025).map((x) => x.cold_days >= 18);
  const cold = pctOf(feb);
  out.push({
    id: 'cold',
    kind: 'cold',
    level: problems.includes('cold') ? 'warning' : levelOf(cold),
    source: 'season',
    title: 'Cold February',
    when: 'Feb, early Boro flowering',
    risk: cold,
    riskText: 'of years',
    why: '18+ nights below 15 °C hurt early-planted Boro',
    action: 'Do not plant Boro before mid-December.',
    months: m.map((x) => x.cold_days),
    highlight: [0, 1, 11],
  });

  if (a && answerOf(a, 'drainage') === 'week')
    out.push({ id: 'waterlog', kind: 'waterlogging', level: 'warning', source: 'you', title: 'Water stays too long', when: 'After heavy rain', risk: 60, riskText: 'from your answer', why: 'Roots rot, fertiliser is lost', action: 'Dig a drain from the lowest corner.' });
  if (problems.includes('pests'))
    out.push({ id: 'pests', kind: 'pests', level: 'warning', source: 'you', title: 'Insects', when: 'Aman: Aug–Oct', risk: 50, riskText: 'from your answer', why: 'Stem borer and planthopper hit Aman', action: 'Bird perches and light traps first.' });

  return out.sort((x, y) => RANK[x.level] - RANK[y.level] || y.risk - x.risk);
}

function avg(xs: number[]) {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

/** Risk calendar: per month, the level for each risk (for the 12-month grid). */
export function riskCalendar(b: Bundle) {
  const m = b.climate_monthly;
  const lvl = (v: number, warn: number, bad: number): Level => (v >= bad ? 'serious' : v >= warn ? 'warning' : 'good');
  return [
    { label: 'Heat', values: m.map((x) => lvl(x.heat_days, 3, 8)) },
    { label: 'Heavy rain', values: m.map((x) => lvl(x.heavy_days, 0.3, 0.6)) },
    { label: 'Flood', values: m.map((x) => lvl(x.rain_mm, 250, 330)) },
    { label: 'Dry soil', values: m.map((x) => lvl(1 - x.gwet_root, 0.35, 0.5)) },
    { label: 'Cold', values: m.map((x) => lvl(x.cold_days, 5, 15)) },
  ];
}
