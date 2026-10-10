"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { LegendRow, Tip } from "@/components/charts/tip";
import { sensor } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const SERIES = [
  { key: "node10", label: "Sensor at 10 cm", color: "var(--chart-1)" },
  { key: "node30", label: "Sensor at 30 cm", color: "var(--chart-2)" },
  { key: "smap", label: "Satellite root zone", color: "var(--chart-3)" },
];
const dayTime = (v: string | number | undefined) => {
  const d = Number(v);
  return `Day ${Math.floor(d) + 1}, ${String((d % 1) * 24).padStart(2, "0")}:00`;
};

/* Soil moisture from the field node at two depths, against the satellite estimate for the same place. */
export function SensorChart({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <LegendRow items={SERIES.map((s) => ({ label: s.label, color: s.color, kind: "line" as const }))} />
      <ChartContainer config={{}} className={cn("aspect-auto w-full", compact ? "h-40" : "h-80")}>
        <LineChart data={sensor} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day" type="number" domain={[0, 13.75]} ticks={[0, 2, 4, 6, 8, 10, 12]} hide={compact}
            tickFormatter={(v: number) => `Day ${v + 1}`} tickLine={false} axisLine={false} tickMargin={8}
          />
          <YAxis width={44} domain={[0.14, 0.38]} hide={compact} tickFormatter={(v: number) => v.toFixed(2)} tickLine={false} axisLine={false} tickMargin={8} />
          <Tooltip content={<Tip title={dayTime} value={(v) => (v as number).toFixed(3) + " m³/m³"} />} />
          {SERIES.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
