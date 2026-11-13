/**
 * Turns onboarding answers into personal advice:
 *  - the farmer's current rotation (added as an option if it is not already one)
 *  - priority weights for the rotation engine
 *  - constraints (no irrigation → rotations that need pumping are flagged, not recommended)
 *  - soil-nutrient advice (rules from the Fertilizer Recommendation Guide 2018, BARC)
 */

import { DEFAULT_WEIGHTS, evaluate, type Evaluation, type Weights } from './engine';
import { answerOf, answersOf, type Answers } from './questions';
import type { Bundle, Crop, Rotation, RotationSlot } from './types';

const RABI: Record<string, RotationSlot> = {
  boro: { crop: 'boro', start: 1, months: 5 },
  wheat: { crop: 'wheat', start: 11, months: 4 },
  maize: { crop: 'maize', start: 11, months: 5 },
  potato: { crop: 'potato', start: 11, months: 4 },
  mustard: { crop: 'mustard', start: 11, months: 3 },
  veg_winter: { crop: 'veg_winter', start: 11, months: 4 },
};
const SUMMER: Record<string, RotationSlot> = {
  aus: { crop: 'aus', start: 5, months: 3 },
  jute: { crop: 'jute', start: 4, months: 4 },
  mungbean: { crop: 'mungbean', start: 3, months: 3 },
  veg_summer: { crop: 'veg_summer', start: 3, months: 3 },
};

/** The rotation the farmer told us they grow. */
export function rotationFromAnswers(a: Answers, crops: Record<string, Crop>): Rotation | null {
  const slots: RotationSlot[] = [];
  const rabi = RABI[answerOf(a, 'rabi_crop') ?? ''];
  const summer = SUMMER[answerOf(a, 'summer_crop') ?? ''];
  if (rabi) slots.push(rabi);
  if (summer) {
    // Boro runs to May: a summer crop after Boro starts in June
    slots.push(rabi?.crop === 'boro' ? { ...summer, start: 6, months: Math.min(summer.months, 1) } : summer);
  }
  if (answerOf(a, 'aman_crop') === 'aman') slots.push({ crop: 'aman', start: 7, months: 4 });
  if (!slots.length || slots.some((s) => !crops[s.crop])) return null;
  const name = slots
    .slice()
    .sort((x, y) => ((x.start + 1) % 12) - ((y.start + 1) % 12))
    .map((s) => crops[s.crop].name.replace(' rice', ''))
    .join(' – ');
  return { id: 'r-yours', name: name || 'Your crops', short: 'Yours', is_current: true, slots, note: 'What you told us you grow now.' };
}

export function weightsFromAnswers(a: Answers): Weights {
  const picked = answersOf(a, 'priorities');
  if (!picked.length) return DEFAULT_WEIGHTS;
  const w: Weights = { climate: 1, water: 1, soil: 1, income: 1 };
  for (const p of picked) if (p in w) w[p as keyof Weights] = 3;
  if (answerOf(a, 'water_cost') === 'high') w.water = Math.max(w.water, 2);
  return w;
}

export type Personal = {
  bundle: Bundle;
  weights: Weights;
  /** rotation ids the farmer cannot grow (e.g. needs irrigation they do not have) */
  blocked: Record<string, string>;
};

/** Bundle with the farmer's own rotation, plus constraints from their answers. */
export function personalize(bundle: Bundle, a: Answers | null): Personal {
  if (!a) return { bundle, weights: DEFAULT_WEIGHTS, blocked: {} };
  const crops = Object.fromEntries(bundle.crops.map((c) => [c.id, c]));
  const mine = rotationFromAnswers(a, crops);
  let rotations = bundle.rotations;
  if (mine) {
    const key = (r: Rotation) => r.slots.map((s) => s.crop).sort().join('+');
    const same = rotations.find((r) => key(r) === key(mine));
    rotations = same
      ? rotations.map((r) => ({ ...r, is_current: r.id === same.id }))
      : [{ ...mine }, ...rotations.map((r) => ({ ...r, is_current: false }))];
  }
  return { bundle: { ...bundle, rotations }, weights: weightsFromAnswers(a), blocked: {} };
}

/** Evaluate, then keep blocked rotations out of the recommendation. */
export function evaluateFor(p: Personal, weights: Weights, a: Answers | null): Evaluation & { blocked: Record<string, string> } {
  const ev = evaluate(p.bundle, weights);
  const blocked: Record<string, string> = {};
  if (a && answerOf(a, 'irrigation') === 'none') {
    for (const r of ev.results) if (r.water.observed > 250) blocked[r.rotation.id] = 'Needs irrigation, and you said you cannot water in the dry season';
  }
  if (a && answerOf(a, 'market') === 'hard') {
    for (const r of ev.results) if (r.rotation.slots.some((s) => s.crop === 'maize')) blocked[r.rotation.id] ??= 'Maize needs a buyer, and you said selling new crops is hard';
  }
  const allowed = ev.results.filter((r) => !blocked[r.rotation.id]);
  return { ...ev, recommended: allowed[0] ?? ev.recommended, blocked };
}

// ----------------------------------------------------------------------------- nutrients

export type NutrientTip = {
  id: string;
  title: string;
  why: string;
  how: string;
  icon: 'leaf' | 'water' | 'science' | 'harvest' | 'warning' | 'check';
  level: 'serious' | 'warning' | 'good';
  /** which soil-health bar this improves, and by how much (rule of thumb) */
  improves?: { bar: 0 | 1 | 2; gain: number };
};

/** Soil-health picture from the answers: three bars out of 100 (explainable rules). */
export function soilPicture(a: Answers | null) {
  const f = a ? answersOf(a, 'fertilisers') : [];
  const straw = a ? answerOf(a, 'straw') : undefined;
  const organic = Math.max(10, Math.min(95, 45 + (f.includes('dung') ? 20 : 0) + (straw === 'leave' ? 15 : straw === 'burn' ? -20 : 0) + (answerOf(a ?? {}, 'summer_crop') === 'mungbean' ? 10 : 0)));
  const balance = Math.max(10, Math.min(95, 20 + ['urea', 'tsp', 'mop', 'gypsum', 'zinc', 'boron'].filter((x) => f.includes(x)).length * 13));
  const water = Math.max(10, Math.min(95, a ? (answerOf(a, 'drainage') === 'week' ? 30 : answerOf(a, 'drainage') === 'few_days' ? 60 : 85) : 60));
  return [
    { label: 'Living matter (compost, roots, straw)', value: organic },
    { label: 'Balanced feeding (N, P, K, S, Zn, B)', value: balance },
    { label: 'Drainage', value: water },
  ];
}

export function nutrientTips(a: Answers | null, recommended: Rotation, crops: Record<string, Crop>): NutrientTip[] {
  if (!a) return [];
  const f = answersOf(a, 'fertilisers');
  const tips: NutrientTip[] = [];
  const grows = (id: string) => recommended.slots.some((s) => s.crop === id) || answerOf(a, 'rabi_crop') === id;
  const rice = recommended.slots.some((s) => crops[s.crop]?.water !== 'upland');

  if (answerOf(a, 'soil_test') !== 'recent')
    tips.push({ id: 'test', improves: { bar: 1, gain: 25 }, level: 'serious', icon: 'science', title: 'Get a soil test', why: 'Every field is different. A test tells you exactly how much fertiliser to buy, so you do not waste money.', how: 'Take soil from 10 spots in the field, mix it, and bring 500 g to the Upazila agriculture office or the SRDI soil lab.' });
  if (answerOf(a, 'straw') === 'burn')
    tips.push({ id: 'burn', improves: { bar: 0, gain: 20 }, level: 'serious', icon: 'warning', title: 'Stop burning straw', why: 'Burning throws away potash and sulphur and kills the small life that keeps soil soft.', how: 'Leave the straw in the field to rot, mix it in when ploughing, or use it for compost.' });
  if (f.length === 1 && f[0] === 'urea')
    tips.push({ id: 'balance', improves: { bar: 1, gain: 26 }, level: 'serious', icon: 'leaf', title: 'Do not use only urea', why: 'Urea makes leaves green, but grain also needs phosphorus (TSP) and potash (MoP).', how: 'Add TSP and MoP at planting. Ask the agriculture officer for the dose for your soil.' });
  if (!f.includes('dung'))
    tips.push({
      id: 'dung',
      improves: { bar: 0, gain: 20 },
      level: 'warning',
      icon: 'harvest',
      title: answerOf(a, 'cattle') === 'yes' ? 'Use your cow dung on the field' : 'Add compost or cow dung',
      why: 'It feeds the soil slowly, holds water in dry months and makes fertiliser work better.',
      how: 'About 5 tonnes per hectare (roughly 650 kg per bigha), spread before the last ploughing.',
    });
  if (rice && !f.includes('zinc'))
    tips.push({ id: 'zinc', improves: { bar: 1, gain: 13 }, level: 'warning', icon: 'science', title: 'Rice needs zinc', why: 'Many rice fields in Bangladesh lack zinc. Plants stay short with brown spots.', how: 'Zinc sulphate at final land preparation, about 10 kg per hectare (1.3 kg per bigha), once every two rice seasons.' });
  if (grows('mustard') && (!f.includes('gypsum') || !f.includes('boron')))
    tips.push({ id: 'mustard', improves: { bar: 1, gain: 13 }, level: 'warning', icon: 'leaf', title: 'Mustard needs sulphur and boron', why: 'Without them the pods fill poorly and you get less oil seed.', how: 'Add gypsum (sulphur) and boric acid (boron) at sowing, as the agriculture office advises.' });
  if (recommended.slots.some((s) => crops[s.crop]?.legume))
    tips.push({ id: 'legume', improves: { bar: 0, gain: 10 }, level: 'good', icon: 'leaf', title: 'Mungbean feeds your soil', why: 'Its roots take nitrogen from the air. After harvest, the next rice needs less urea.', how: 'Pick the pods, then plough the plants into the soil before planting Aman.' });
  if (answerOf(a, 'drainage') === 'week')
    tips.push({ id: 'drain', improves: { bar: 2, gain: 30 }, level: 'warning', icon: 'water', title: 'Help water leave the field', why: 'Standing water for a week rots roots and washes nutrients away.', how: 'Dig a small drain at the lowest corner to the nearest canal before the rains.' });
  return tips;
}
