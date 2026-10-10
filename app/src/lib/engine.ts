/* Furrow — ranking logic: priority-weighted scores and minimax regret. */
import {
  backtest, futures, history, quantile, rotations, scores,
  type CriterionId, type Future, type HistoryYear, type Rotation,
} from "./sample-data";

export const CRITERIA: { id: CriterionId; label: string }[] = [
  { id: "climate", label: "Climate resilience" },
  { id: "water", label: "Water saving" },
  { id: "soil", label: "Soil health" },
  { id: "income", label: "Income" },
];

export type Weights = Record<CriterionId, number>;
export const DEFAULT_WEIGHTS: Weights = { climate: 3, water: 3, soil: 3, income: 3 };

export interface RankRow {
  rotation: Rotation;
  median: Record<CriterionId, number>;
  combined: number[]; // one per future in the horizon
  combinedMedian: number;
  regrets: number[]; // one per future in the horizon
  worstRegret: number;
  irrigation: [number, number]; // p10–p90, mm per year
}
export interface Ranking { rows: RankRow[]; futures: Future[] }

/* Regret in a future = best rotation's combined score there − this rotation's.
   Rows come back sorted by worst regret, smallest first. */
export function rank(horizon: string, weights: Weights): Ranking {
  const idx = futures.map((f, i) => (f.horizon === horizon ? i : -1)).filter((i) => i >= 0);
  const total = CRITERIA.reduce((s, c) => s + weights[c.id], 0);
  const w = (id: CriterionId) => (total > 0 ? weights[id] / total : 1 / CRITERIA.length);
  const combined = (rotId: string, i: number) => CRITERIA.reduce((s, c) => s + scores[rotId][i][c.id] * w(c.id), 0);
  const best = idx.map((i) => Math.max(...rotations.map((r) => combined(r.id, i))));

  const rows = rotations.map((rotation): RankRow => {
    const comb = idx.map((i) => combined(rotation.id, i));
    const regrets = comb.map((v, k) => best[k] - v);
    const median = {} as Record<CriterionId, number>;
    CRITERIA.forEach((c) => { median[c.id] = quantile(idx.map((i) => scores[rotation.id][i][c.id]), 0.5); });
    const irr = idx.map((i) => scores[rotation.id][i].irrigationMm);
    return {
      rotation, median, combined: comb, combinedMedian: quantile(comb, 0.5),
      regrets, worstRegret: Math.max(...regrets),
      irrigation: [quantile(irr, 0.1), quantile(irr, 0.9)],
    };
  });
  rows.sort((a, b) => a.worstRegret - b.worstRegret || b.combinedMedian - a.combinedMedian);
  return { rows, futures: idx.map((i) => futures[i]) };
}

/* Least-squares slope per decade. */
export function trendPerDecade(points: [number, number][]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  const slope = points.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / points.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  return { slope: slope * 10, at: (x: number) => my + slope * (x - mx) };
}

export type Outcome = "hit" | "miss" | "alarm" | "quiet";
export function outcome(h: HistoryYear): Outcome {
  const flagged = h.stressIndex >= backtest.stressThreshold;
  const poor = h.ndviAnom <= backtest.ndviThreshold;
  return flagged && poor ? "hit" : !flagged && poor ? "miss" : flagged ? "alarm" : "quiet";
}
export const outcomes = history.map((h) => ({ ...h, outcome: outcome(h) }));

export function correlation(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0, da = 0, db = 0;
  a.forEach((v, i) => { num += (v - ma) * (b[i] - mb); da += (v - ma) ** 2; db += (b[i] - mb) ** 2; });
  return num / Math.sqrt(da * db);
}
