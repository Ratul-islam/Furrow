/* Values derived once from the sample data: trends, backtest outcomes, sensor agreement. */
import * as D from "./sample-data";
import { correlation, outcomes, trendPerDecade, type Outcome } from "./engine";
import { mean } from "./format";

const H = D.history;

export const tempTrend = trendPerDecade(H.map((h) => [h.year, h.tempAnom]));
export const rainTrend = trendPerDecade(H.map((h) => [h.year, h.rainAnomPct]));
export const seasonTrend = trendPerDecade(H.map((h) => [h.year, h.seasonDays]));
export const ndviTrend = trendPerDecade(H.map((h) => [h.year, h.ndviAnom]));
export const soilYears = H.filter((h) => h.soilMoisture != null);
export const soilMean = mean(soilYears.map((h) => h.soilMoisture as number));

export const OUTCOME: Record<Outcome, { label: string; short: string; color: string }> = {
  hit: { label: "Poor crop year, flagged", short: "Flagged correctly", color: "var(--status-good)" },
  quiet: { label: "Normal year, not flagged", short: "Normal year", color: "var(--chart-neutral)" },
  miss: { label: "Poor crop year, missed", short: "Missed", color: "var(--status-critical)" },
  alarm: { label: "Flagged, but crops were fine", short: "False alarm", color: "var(--status-warning)" },
};
const count = (o: Outcome) => outcomes.filter((y) => y.outcome === o).length;
export const backtestCounts: Record<Outcome, number> = { hit: count("hit"), quiet: count("quiet"), miss: count("miss"), alarm: count("alarm") };
export const wrongYears = outcomes.filter((y) => y.outcome === "miss" || y.outcome === "alarm");

export const sensorBias = mean(D.sensor.map((r) => r.node30 - r.smap));
export const sensorR = correlation(D.sensor.map((r) => r.node30), D.sensor.map((r) => r.smap));

export type MetricKey = "dT" | "dP" | "heatDays" | "drySpell";
export const METRICS: { key: MetricKey; title: string; unit: string; sub: string; digits: number; signed: boolean; ref: number }[] = [
  { key: "dT", title: "Temperature", unit: "°C", sub: "Change from the 2000–2025 average", digits: 1, signed: true, ref: 0 },
  { key: "dP", title: "Monsoon rainfall", unit: "%", sub: "Change from the 2000–2025 average", digits: 0, signed: true, ref: 0 },
  { key: "heatDays", title: "Heat-stress days", unit: "days", sub: "Days a season above the crop’s heat limit", digits: 0, signed: false, ref: D.baseline.heatDays },
  { key: "drySpell", title: "Longest dry spell", unit: "days", sub: "Days without rain in the growing season", digits: 0, signed: false, ref: D.baseline.drySpell },
];

/* Shared axis for a metric across both horizons, so switching horizon shows the shift. */
export function metricDomain(key: MetricKey, ref: number): [number, number] {
  const vals = D.futures.map((f) => f[key]).concat(ref);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.06;
  return [lo - pad, hi + pad];
}
