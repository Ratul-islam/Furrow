"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { LegendRow, Tip } from "@/components/charts/tip";
import { scenarioColor } from "@/components/charts/projection-charts";
import { useDashboard } from "@/components/dashboard-context";
import { CRITERIA } from "@/lib/engine";
import { scenarios } from "@/lib/sample-data";
import { one } from "@/lib/format";

const axis = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

/* The recommended rotation against the current one, on the four things the farmer weighs. */
export function CompareBars() {
  const { pick, current } = useDashboard();
  const same = pick === current;
  const data = CRITERIA.map((c) => ({ criterion: c.label, pick: Math.round(pick.median[c.id]), current: Math.round(current.median[c.id]) }));

  return (
    <div className="flex flex-col gap-3">
      <LegendRow items={same
        ? [{ label: "Recommended, and already the current rotation", color: "var(--primary)" }]
        : [{ label: "Recommended", color: "var(--primary)" }, { label: "Current rotation", color: "var(--chart-neutral)" }]} />
      <ChartContainer config={{ pick: { label: "Recommended", color: "var(--primary)" }, current: { label: "Current rotation", color: "var(--chart-neutral)" } }} className="aspect-auto h-72 w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barGap={3} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axis} />
          <YAxis type="category" dataKey="criterion" width={118} {...axis} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<Tip value={(v) => `${v} of 100`} />} />
          <Bar dataKey="pick" name="Recommended" fill="var(--color-pick)" radius={[0, 4, 4, 0]} barSize={12}>
            <LabelList dataKey="pick" position="right" className="fill-foreground" fontSize={12} />
          </Bar>
          {!same && <Bar dataKey="current" name="Current rotation" fill="var(--color-current)" radius={[0, 4, 4, 0]} barSize={12} />}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

/* Worst-case regret of every rotation; the recommended one is the shortest bar. */
export function WorstRegretBars() {
  const { ranking, pick } = useDashboard();
  const data = ranking.rows.map((r) => ({ id: r.rotation.id, name: r.rotation.name, worst: +r.worstRegret.toFixed(1), isPick: r === pick }));

  return (
    <ChartContainer config={{ worst: { label: "Worst-case regret", color: "var(--primary)" } }} className="aspect-auto h-56 w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="id" width={34} {...axis} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={<Tip title={(_, p) => String(p[0]?.payload?.name ?? "")} names={{ worst: "Worst-case regret" }} value={(v) => `${one(v as number)} points`} />}
        />
        <Bar dataKey="worst" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((d) => <Cell key={d.id} fill={d.isPick ? "var(--primary)" : "var(--chart-neutral)"} fillOpacity={d.isPick ? 1 : 0.45} />)}
          <LabelList dataKey="worst" position="right" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

interface RegretPoint { x: number; y: number; model: string; scenario: string; rotation: string }

function RegretTip({ active, payload }: { active?: boolean; payload?: { payload?: RegretPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <div className="font-medium">{p.rotation}</div>
      <div className="text-muted-foreground">{p.model}, {p.scenario}</div>
      <div className="font-medium tabular-nums">{one(p.x)} points behind the best</div>
    </div>
  );
}

/* Regret of each rotation in each climate future: one dot per model and scenario. */
export function RegretStrip() {
  const { ranking } = useDashboard();
  const rows = ranking.rows;
  const series = scenarios.map((sc) => ({
    sc,
    points: rows.flatMap((r, yi) => r.regrets.flatMap((v, k): RegretPoint[] => {
      const f = ranking.futures[k];
      return f.scenario === sc.id ? [{ x: +v.toFixed(2), y: yi, model: f.model, scenario: sc.label, rotation: r.rotation.name }] : [];
    })),
  }));

  return (
    <div className="flex flex-col gap-3">
      <LegendRow items={scenarios.map((sc) => ({ label: sc.label, color: scenarioColor(sc.id) }))} />
      <ChartContainer config={{}} className="aspect-auto w-full" style={{ height: rows.length * 44 + 40 }}>
        <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis type="number" dataKey="x" name="Regret" domain={[0, "auto"]} {...axis} />
          <YAxis
            type="number" dataKey="y" reversed domain={[-0.5, rows.length - 0.5]} width={34}
            ticks={rows.map((_, i) => i)} tickFormatter={(i: number) => rows[i]?.rotation.id ?? ""} interval={0} {...axis}
          />
          <ZAxis range={[70, 70]} />
          <Tooltip cursor={false} content={<RegretTip />} />
          {series.map(({ sc, points }) => (
            <Scatter key={sc.id} name={sc.label} data={points} fill={scenarioColor(sc.id)} fillOpacity={0.8} stroke="var(--card)" strokeWidth={1.5} isAnimationActive={false} />
          ))}
        </ScatterChart>
      </ChartContainer>
    </div>
  );
}
