/**
 * Furrow rotation engine.
 *
 * For every rotation and every climate future (observed 2001–2025 plus
 * NEX-GDDP-CMIP6 model × scenario × horizon), compute:
 *   water   irrigation need (FAO-56: Kc × ET0 − effective rain, + percolation for paddy)
 *   climate expected stress days during each crop's sensitive stage (heat, cold, waterlogging)
 *   soil    rule-based soil-health score (cover, legumes, diversity, continuous rice)
 *   income  illustrative net income after irrigation cost and stress losses
 * Scores are weighted by the farmer's priorities. The recommendation is the
 * rotation with the smallest worst-case regret across all futures (minimax regret).
 *
 * Every constant below is a documented default for the agronomy lead to confirm.
 */

import type { Bundle, Crop, Future, FutureMonth, Rotation, RotationSlot } from './types';

export type Criterion = 'climate' | 'water' | 'soil' | 'income';
export type Weights = Record<Criterion, number>; // 0 (ignore) .. 3 (high)

export const CRITERIA: { key: Criterion; label: string; short: string; help: string }[] = [
  { key: 'climate', label: 'Safe from bad weather', short: 'Weather', help: 'Fewer too-hot, too-cold or flooded days when the crop flowers' },
  { key: 'water', label: 'Save water', short: 'Water', help: 'Less pumping for irrigation' },
  { key: 'soil', label: 'Healthy soil', short: 'Soil', help: 'Soil covered longer, pulses that feed the soil, mixed crops' },
  { key: 'income', label: 'More money', short: 'Money', help: 'Profit after paying for irrigation (example prices)' },
];

export const DEFAULT_WEIGHTS: Weights = { climate: 2, water: 2, soil: 2, income: 2 };

const PERCOLATION_MM = 90; // paddy seepage and percolation, ~3 mm/day (FAO-56 ch. 8; confirm locally)
const PUDDLING_MM = 150; // land soaking and puddling before transplanting
const AWD_FACTOR = 0.75; // alternate wetting and drying saves ~25% (IRRI/BRRI; range 15–30%)
const IRRIGATION_BDT_PER_MM = 17; // shallow tube-well cost per mm per ha (illustrative)
const LOSS_PER_STRESS_DAY = 0.025; // yield loss per stress day at a sensitive stage (illustrative)
const FLOWERING_DAYS = 15; // length of the sensitive window inside the sensitive months
const WET_RAIN_MM = 250; // monthly rain above which upland crops risk waterlogging

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function monthsOf(slot: RotationSlot): number[] {
  return Array.from({ length: slot.months }, (_, i) => ((slot.start - 1 + i) % 12) + 1);
}

/** FAO/AGLW simplified effective rainfall, monthly (mm). */
export function effectiveRain(p: number) {
  return p > 75 ? 0.8 * p - 25 : Math.max(0.6 * p - 10, 0);
}

export function cropWater(crop: Crop, slot: RotationSlot, future: Future) {
  const months = monthsOf(slot);
  const paddy = crop.water !== 'upland';
  let need = 0;
  let etc = 0;
  months.forEach((m, i) => {
    const fm = future.monthly[m - 1];
    const kc = crop.kc[Math.min(i, crop.kc.length - 1)];
    const cropEt = kc * fm.et0_mm;
    etc += cropEt;
    const demand = cropEt + (paddy ? PERCOLATION_MM : 0) + (paddy && i === 0 ? PUDDLING_MM : 0);
    need += Math.max(demand - effectiveRain(fm.rain_mm), 0);
  });
  if (crop.water === 'paddy_awd') need *= AWD_FACTOR;
  return { need, etc };
}

export function cropStress(crop: Crop, slot: RotationSlot, future: Future) {
  const months = monthsOf(slot);
  const sens = crop.sensitive.filter((m) => months.includes(m));
  const days = sens.reduce((s, m) => s + DAYS_IN_MONTH[m - 1], 0) || 1;
  const rice = crop.water !== 'upland';
  const per = (pick: (fm: FutureMonth) => number) =>
    (FLOWERING_DAYS * sens.reduce((s, m) => s + pick(future.monthly[m - 1]), 0)) / days;
  const heat = per((fm) => (crop.heat_c >= 38 ? fm.hot38_days : fm.heat_days));
  const cold = rice ? per((fm) => fm.cold_days) : 0;
  const wet = rice
    ? 0
    : months.reduce((s, m) => s + Math.max(future.monthly[m - 1].rain_mm - WET_RAIN_MM, 0) / 25, 0);
  return { heat, cold, wet, total: heat + cold + wet };
}

export type SoilBreakdown = { label: string; points: number }[];

export function soilHealth(rotation: Rotation, crops: Record<string, Crop>) {
  const list = rotation.slots.map((s) => crops[s.crop]);
  const cover = Math.min(rotation.slots.reduce((s, x) => s + x.months, 0), 12);
  const families = new Set(list.map((c) => c.family));
  const legume = list.some((c) => c.legume);
  const allRice = list.every((c) => c.water !== 'upland');
  const parts: SoilBreakdown = [
    { label: 'Base', points: 30 },
    { label: `Soil covered ${cover} of 12 months`, points: Math.round((cover / 12) * 30) },
    { label: legume ? 'Legume fixes nitrogen' : 'No legume', points: legume ? 20 : 0 },
    { label: `${families.size} crop ${families.size === 1 ? 'family' : 'families'}`, points: (families.size - 1) * 7 },
  ];
  if (allRice) parts.push({ label: 'Rice after rice (puddling harms structure)', points: -10 });
  const score = Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.points, 0)));
  return { score, parts };
}

const clamp = (x: number) => Math.max(0, Math.min(100, x));

export type FutureResult = {
  futureId: string;
  water_mm: number;
  stress_days: number;
  income_bdt: number;
  scores: Record<Criterion, number>;
  total: number;
  regret: number;
};

export type RotationResult = {
  rotation: Rotation;
  soil: ReturnType<typeof soilHealth>;
  byFuture: FutureResult[];
  observed: FutureResult;
  worstRegret: number;
  worstFuture: string;
  meanTotal: number;
  water: { min: number; max: number; observed: number };
  stress: { min: number; max: number; observed: number };
  income: { min: number; max: number; observed: number };
  perCrop: { crop: Crop; slot: RotationSlot; water: number; stress: ReturnType<typeof cropStress> }[];
};

export type Evaluation = {
  results: RotationResult[]; // sorted: lowest worst-case regret first
  recommended: RotationResult;
  current: RotationResult;
  futures: Future[];
  cropIndex: Record<string, Crop>;
};

function weightedTotal(scores: Record<Criterion, number>, w: Weights) {
  const sum = CRITERIA.reduce((s, c) => s + w[c.key], 0);
  if (sum === 0) return CRITERIA.reduce((s, c) => s + scores[c.key], 0) / CRITERIA.length;
  return CRITERIA.reduce((s, c) => s + w[c.key] * scores[c.key], 0) / sum;
}

export function evaluate(bundle: Bundle, weights: Weights): Evaluation {
  const cropIndex = Object.fromEntries(bundle.crops.map((c) => [c.id, c]));
  const futures = bundle.futures;

  const raw = bundle.rotations.map((rotation) => {
    const soil = soilHealth(rotation, cropIndex);
    const byFuture = futures.map((f) => {
      let water = 0;
      let stress = 0;
      let income = 0;
      for (const slot of rotation.slots) {
        const crop = cropIndex[slot.crop];
        const w = cropWater(crop, slot, f).need;
        const s = cropStress(crop, slot, f).total;
        water += w;
        stress += s;
        income += crop.net_bdt_ha * (1 - Math.min(0.5, s * LOSS_PER_STRESS_DAY)) - w * IRRIGATION_BDT_PER_MM;
      }
      const scores: Record<Criterion, number> = {
        climate: clamp(100 - 7 * stress),
        water: clamp(100 * (1 - water / 1500)),
        soil: soil.score,
        income: clamp((100 * income) / 180000),
      };
      return { futureId: f.id, water_mm: water, stress_days: stress, income_bdt: income, scores, total: weightedTotal(scores, weights), regret: 0 };
    });
    const observedFuture = futures[0];
    const perCrop = rotation.slots.map((slot) => {
      const crop = cropIndex[slot.crop];
      return { crop, slot, water: cropWater(crop, slot, observedFuture).need, stress: cropStress(crop, slot, observedFuture) };
    });
    return { rotation, soil, byFuture, perCrop };
  });

  // regret = best total in that future − this rotation's total
  futures.forEach((_, fi) => {
    const best = Math.max(...raw.map((r) => r.byFuture[fi].total));
    raw.forEach((r) => (r.byFuture[fi].regret = best - r.byFuture[fi].total));
  });

  const range = (xs: number[]) => ({ min: Math.min(...xs), max: Math.max(...xs) });
  const results: RotationResult[] = raw.map((r) => {
    const worst = r.byFuture.reduce((a, b) => (b.regret > a.regret ? b : a));
    return {
      ...r,
      observed: r.byFuture[0],
      worstRegret: worst.regret,
      worstFuture: worst.futureId,
      meanTotal: r.byFuture.reduce((s, x) => s + x.total, 0) / r.byFuture.length,
      water: { ...range(r.byFuture.map((x) => x.water_mm)), observed: r.byFuture[0].water_mm },
      stress: { ...range(r.byFuture.map((x) => x.stress_days)), observed: r.byFuture[0].stress_days },
      income: { ...range(r.byFuture.map((x) => x.income_bdt)), observed: r.byFuture[0].income_bdt },
    };
  });
  results.sort((a, b) => a.worstRegret - b.worstRegret || b.meanTotal - a.meanTotal);

  return {
    results,
    recommended: results[0],
    current: results.find((r) => r.rotation.is_current) ?? results[0],
    futures,
    cropIndex,
  };
}

export function futureLabel(f: Future) {
  if (f.scenario === 'observed') return 'today’s weather';
  return `a ${f.scenario === 'ssp245' ? 'medium' : 'hot'} future in the ${f.horizon}`;
}

// ----------------------------------------------------------------------------- plan

export type PlanTask = {
  start: string; // ISO date
  end?: string;
  title: string;
  crop: string;
  kind: 'prepare' | 'sow' | 'transplant' | 'watch' | 'harvest';
  note: string;
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Season plan for the next 12 months (from `from`, default the field's season
 * start in November) for one rotation.
 */
export function planTasks(rotation: Rotation, crops: Record<string, Crop>, boroWindow: [string, string], fromYear = 2026): PlanTask[] {
  const tasks: PlanTask[] = [
    { start: iso(fromYear, 11, 1), end: iso(fromYear, 11, 15), title: 'Harvest T. Aman', crop: 'aman', kind: 'harvest', note: 'Current crop. Drone shows the wet north-east corner ripening late; harvest it last.' },
  ];
  // order slots by the season year starting in November
  const order = (m: number) => (m >= 11 ? m - 11 : m + 1);
  const slots = [...rotation.slots].sort((a, b) => order(a.start) - order(b.start));
  for (const slot of slots) {
    const crop = crops[slot.crop];
    const y = slot.start >= 11 ? fromYear : fromYear + 1;
    const months = monthsOf(slot);
    const endM = months[months.length - 1];
    const endY = endM >= 11 ? fromYear : fromYear + 1;
    if (crop.id === 'aman') continue; // next Aman is outside the dry-season plan focus; added below
    if (crop.water !== 'upland') {
      const [ws, we] = crop.id === 'late_boro' ? ['02-01', '02-15'] : boroWindow;
      const [sm, sd] = ws.split('-').map(Number);
      const [em, ed] = we.split('-').map(Number);
      const seed = new Date(Date.UTC(y, sm - 1, sd - 35));
      tasks.push({ start: seed.toISOString().slice(0, 10), title: `${crop.name}: sow the seedbed`, crop: crop.id, kind: 'prepare', note: 'About 35 days before planting out the seedlings.' });
      tasks.push({
        start: iso(y, sm, sd),
        end: iso(y, em, ed),
        title: `Plant out ${crop.name}`,
        crop: crop.id,
        kind: 'transplant',
        note: crop.id === 'late_boro' ? 'Planted later, after mustard, so it flowers in hot April.' : 'Then the rice flowers after the January cold and before the April heat.',
      });
    } else {
      tasks.push({ start: iso(y, slot.start, slot.start === 11 ? 16 : 5), end: iso(y, slot.start, slot.start === 11 ? 30 : 20), title: `Sow ${crop.name}`, crop: crop.id, kind: 'sow', note: crop.legume ? 'Legume: needs little fertiliser and leaves nitrogen for the next crop.' : 'Needs little water: irrigate only when the soil is dry.' });
    }
    tasks.push({ start: iso(crop.sensitive[0] >= 11 ? fromYear : fromYear + 1, crop.sensitive[0], 1), title: `${crop.name}: ${crop.sensitive_label}`, crop: crop.id, kind: 'watch', note: crop.water !== 'upland' ? 'Most sensitive stage. Above 35 °C or below 15 °C now costs grain; keep water standing.' : [12, 1, 2].includes(crop.sensitive[0]) ? 'Most sensitive stage. Keep the soil moist and scout for aphids in foggy weather.' : `Most sensitive stage. Days above ${crop.heat_c} °C now cut the yield; irrigate lightly if the soil is dry.` });
    tasks.push({ start: iso(endY, endM, 15), end: iso(endY, endM, 30), title: `Harvest ${crop.name}`, crop: crop.id, kind: 'harvest', note: '' });
  }
  const aman = rotation.slots.find((s) => s.crop === 'aman');
  if (aman) {
    tasks.push({ start: iso(fromYear + 1, 7, 10), end: iso(fromYear + 1, 7, 31), title: 'Plant out T. Aman', crop: 'aman', kind: 'transplant', note: 'Monsoon crop; the rain does most of the watering.' });
  }
  return tasks.sort((a, b) => a.start.localeCompare(b.start));
}
