"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LegendRow, Tip } from "@/components/charts/tip";
import { useDashboard } from "@/components/dashboard-context";
import { fan, history, quantile, scenarios } from "@/lib/sample-data";
import { METRICS, metricDomain, type MetricKey } from "@/lib/derived";
import { signed } from "@/lib/format";
import { cn } from "@/lib/utils";

export const scenarioColor = (id: string) => `var(--chart-${scenarios.findIndex((s) => s.id === id) + 1})`;

interface FanRow { year: number; observed?: number; band_ssp245?: number[]; mid_ssp245?: number; band_ssp585?: number[]; mid_ssp585?: number }
const fanData: FanRow[] = [];
history.forEach((h) => fanData.push({ year: h.year, observed: h.tempAnom }));
for (let y = 2025; y <= 2060; y++) {
  const row: FanRow = fanData.find((r) => r.year === y) ?? { year: y };
  scenarios.forEach((sc) => {
    const p = fan[sc.id].find((q) => q.year === y);
    if (!p) return;
    row[`band_${sc.id}` as "band_ssp245"] = [p.p10, p.p90];
    row[`mid_${sc.id}` as "mid_ssp245"] = p.p50;
  });
  if (!fanData.includes(row)) fanData.push(row);
}

const FAN_NAMES: Record<string, string> = { observed: "Observed" };
scenarios.forEach((sc) => {
  FAN_NAMES[`mid_${sc.id}`] = `${sc.label}, middle of the models`;
  FAN_NAMES[`band_${sc.id}`] = `${sc.label}, most models`;
});

/* Temperature: observed to 2025, then the spread of the models to 2060 under each scenario. */
export function FanChart({ className }: { className?: string }) {
  const { horizon } = useDashboard();
  const degrees = (v: number | number[]) => (Array.isArray(v) ? `${signed(v[0], 2)} to ${signed(v[1], 2)} °C` : `${signed(v, 2)} °C`);

  return (
    <div className="flex flex-col gap-3">
      <LegendRow items={[
        { label: "Observed", color: "var(--chart-neutral)", kind: "line" },
        ...scenarios.map((sc) => ({ label: `${sc.label}, ${sc.note}`, color: scenarioColor(sc.id), kind: "line" as const })),
        { label: "Shaded: where most models fall", color: "var(--chart-neutral)", kind: "band" },
      ]} />
      <ChartContainer config={{ observed: { label: "Observed", color: "var(--chart-neutral)" } }} className={cn("aspect-auto h-80 w-full", className)}>
        <ComposedChart data={fanData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="year" type="number" domain={[2000, 2060]} ticks={[2000, 2010, 2020, 2030, 2040, 2050, 2060]} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={44} tickFormatter={(v: number) => signed(v, 1)} tickLine={false} axisLine={false} tickMargin={8} />
          <ReferenceArea
            x1={horizon.from} x2={Math.min(horizon.to + 1, 2060)} fill="var(--primary)" fillOpacity={0.07} stroke="none"
            label={{ value: `Planning for the ${horizon.label}`, position: "insideTop", fill: "var(--muted-foreground)", fontSize: 12, offset: 10 }}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <ChartTooltip content={<Tip names={FAN_NAMES} value={degrees} />} />
          {scenarios.map((sc) => (
            <Area key={`band-${sc.id}`} dataKey={`band_${sc.id}`} type="monotone" stroke="none" fill={scenarioColor(sc.id)} fillOpacity={0.16} activeDot={false} connectNulls />
          ))}
          <Line dataKey="observed" type="monotone" stroke="var(--chart-neutral)" strokeWidth={2} dot={false} />
          {scenarios.map((sc) => (
            <Line key={`mid-${sc.id}`} dataKey={`mid_${sc.id}`} type="monotone" stroke={scenarioColor(sc.id)} strokeWidth={2} dot={false} />
          ))}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

/* One projected quantity in the chosen decade: for each scenario, the range most models fall in and the middle model. */
export function RangeRows({ metric }: { metric: MetricKey }) {
  const { ranking } = useDashboard();
  const m = METRICS.find((x) => x.key === metric)!;
  const fmt = (v: number) => (m.signed ? signed(v, m.digits) : v.toFixed(m.digits));
  const [lo, hi] = metricDomain(m.key, m.ref);
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;

  return (
    <div className="flex flex-col gap-4">
      {scenarios.map((sc) => {
        const vals = ranking.futures.filter((f) => f.scenario === sc.id).map((f) => f[m.key]);
        const p10 = quantile(vals, 0.1), p50 = quantile(vals, 0.5), p90 = quantile(vals, 0.9);
        return (
          <Tooltip key={sc.id}>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-2" tabIndex={0}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{sc.label}</span>
                  <span className="font-medium tabular-nums">{fmt(p10)} to {fmt(p90)} {m.unit}</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-muted">
                  <div className="absolute -inset-y-1 w-px bg-foreground/40" style={{ left: `${pct(m.ref)}%` }} />
                  <div className="absolute inset-y-0 rounded-full opacity-45" style={{ left: `${pct(p10)}%`, width: `${Math.max(1.5, pct(p90) - pct(p10))}%`, background: scenarioColor(sc.id) }} />
                  <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card" style={{ left: `${pct(p50)}%`, background: scenarioColor(sc.id) }} />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {sc.label}, {sc.note}. Middle of the models: {fmt(p50)} {m.unit}. Most models: {fmt(p10)} to {fmt(p90)} {m.unit}.
            </TooltipContent>
          </Tooltip>
        );
      })}
      <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{fmt(lo)}</span>
        <span>Line: 2000–2025 average, {fmt(m.ref)} {m.unit}</span>
        <span>{fmt(hi)}</span>
      </div>
    </div>
  );
}
