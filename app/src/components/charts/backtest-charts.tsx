"use client";

import { CartesianGrid, Pie, PieChart, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { LegendRow } from "@/components/charts/tip";
import { backtest } from "@/lib/sample-data";
import { outcomes, type Outcome } from "@/lib/engine";
import { OUTCOME, backtestCounts } from "@/lib/derived";
import { signed } from "@/lib/format";

const axis = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

interface YearPoint { year: number; stressIndex: number; ndviAnom: number; outcome: Outcome }
const right: YearPoint[] = outcomes.filter((y) => y.outcome === "hit" || y.outcome === "quiet");
const wrong: YearPoint[] = outcomes.filter((y) => y.outcome === "miss" || y.outcome === "alarm");

function YearTip({ active, payload }: { active?: boolean; payload?: { payload?: YearPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <div className="font-medium">{p.year}: {OUTCOME[p.outcome].label}</div>
      <div className="flex justify-between gap-6"><span className="text-muted-foreground">Stress score</span><span className="font-medium tabular-nums">{p.stressIndex}</span></div>
      <div className="flex justify-between gap-6"><span className="text-muted-foreground">Greenness</span><span className="font-medium tabular-nums">{signed(p.ndviAnom, 3)}</span></div>
    </div>
  );
}

const Hollow = ({ cx, cy }: { cx?: number; cy?: number }) => (
  <circle cx={cx} cy={cy} r={5} fill="var(--card)" stroke="var(--chart-1)" strokeWidth={2} />
);

/* One dot per year: the stress score against how green the crops were. Hollow dots are years the score got wrong. */
export function BacktestScatter() {
  return (
    <div className="flex flex-col gap-3">
      <LegendRow items={[
        { label: "Called correctly", color: "var(--chart-1)" },
        { label: "Got wrong", color: "var(--chart-1)", kind: "ring" },
        { label: "Shaded: poor crop years the score flagged", color: "var(--chart-neutral)", kind: "band" },
      ]} />
      <ChartContainer config={{}} className="aspect-auto h-80 w-full">
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 20 }} accessibilityLayer>
          <CartesianGrid />
          <XAxis
            type="number" dataKey="stressIndex" domain={[0, 80]} ticks={[0, 20, 40, 60, 80]} {...axis}
            label={{ value: "Climate stress score, 0 to 100", position: "insideBottom", offset: -14, fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis type="number" dataKey="ndviAnom" domain={[-0.06, 0.06]} ticks={[-0.06, -0.03, 0, 0.03, 0.06]} width={52} tickFormatter={(v: number) => signed(v, 2)} {...axis} />
          <ReferenceArea x1={backtest.stressThreshold} x2={80} y1={-0.06} y2={backtest.ndviThreshold} fill="var(--chart-neutral)" fillOpacity={0.12} stroke="none" />
          <ReferenceLine x={backtest.stressThreshold} stroke="var(--muted-foreground)" strokeOpacity={0.6} label={{ value: "Flagged from here", position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />
          <ReferenceLine y={backtest.ndviThreshold} stroke="var(--muted-foreground)" strokeOpacity={0.6} label={{ value: "Poor crop year below", position: "insideBottomLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />
          <Tooltip cursor={false} content={<YearTip />} />
          <Scatter name="Called correctly" data={right} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={1.5} isAnimationActive={false} />
          <Scatter name="Got wrong" data={wrong} shape={Hollow} isAnimationActive={false} />
        </ScatterChart>
      </ChartContainer>
    </div>
  );
}

const ORDER: Outcome[] = ["hit", "quiet", "miss", "alarm"];
const donut = ORDER.map((o) => ({ key: o, label: OUTCOME[o].short, value: backtestCounts[o], fill: OUTCOME[o].color }));

/* How the 26 years split into right and wrong calls. The list beside the ring carries the labels. */
export function OutcomeDonut() {
  const correct = backtestCounts.hit + backtestCounts.quiet;
  return (
    <div className="flex items-center gap-6">
      <div className="relative size-36 shrink-0">
        <ChartContainer config={{}} className="aspect-square size-36">
          <PieChart>
            <Pie data={donut} dataKey="value" nameKey="label" innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0} isAnimationActive={false} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{correct}</span>
          <span className="text-[11px] text-muted-foreground">of {outcomes.length} right</span>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {donut.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
