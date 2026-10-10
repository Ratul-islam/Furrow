"use client";

import { useId } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Tip } from "@/components/charts/tip";
import { history } from "@/lib/sample-data";
import { soilYears, tempTrend } from "@/lib/derived";
import { signed } from "@/lib/format";

const axis = { tickLine: false, axisLine: false, tickMargin: 8 } as const;
const FIVE_YEARS = [2000, 2005, 2010, 2015, 2020, 2025];

const tempData = history.map((h) => ({ year: h.year, temp: h.tempAnom, trend: +tempTrend.at(h.year).toFixed(2) }));

export function TempTrendChart() {
  return (
    <ChartContainer
      config={{ temp: { label: "Yearly value", color: "var(--chart-1)" }, trend: { label: "Trend", color: "var(--chart-neutral)" } }}
      className="aspect-auto h-64 w-full"
    >
      <ComposedChart data={tempData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <defs>
          <linearGradient id="fill-temp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-temp)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-temp)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="year" ticks={FIVE_YEARS} {...axis} />
        <YAxis width={44} tickFormatter={(v: number) => signed(v, 1)} {...axis} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Tooltip content={<Tip value={(v) => signed(v as number, 2) + " °C"} />} />
        <Area dataKey="temp" name="Yearly value" type="monotone" baseValue="dataMin" fill="url(#fill-temp)" stroke="var(--color-temp)" strokeWidth={2} />
        <Line dataKey="trend" name="Trend" type="linear" stroke="var(--color-trend)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} />
      </ComposedChart>
    </ChartContainer>
  );
}

const ANOMALY = {
  rain: {
    data: history.map((h) => ({ year: h.year, up: h.rainAnomPct > 0 ? h.rainAnomPct : null, down: h.rainAnomPct <= 0 ? h.rainAnomPct : null })),
    up: "Wetter than average", down: "Drier than average",
    tick: (v: number) => signed(v, 0) + "%", tip: (v: number) => signed(v, 1) + " %",
  },
  ndvi: {
    data: history.map((h) => ({ year: h.year, up: h.ndviAnom > 0 ? h.ndviAnom : null, down: h.ndviAnom <= 0 ? h.ndviAnom : null })),
    up: "Greener than average", down: "Less green than average",
    tick: (v: number) => signed(v, 2), tip: (v: number) => signed(v, 3),
  },
};

/* Yearly difference from the long-term average: above in blue, below in red. */
export function AnomalyBars({ series }: { series: keyof typeof ANOMALY }) {
  const s = ANOMALY[series];
  return (
    <ChartContainer
      config={{ up: { label: s.up, color: "var(--chart-1)" }, down: { label: s.down, color: "var(--chart-negative)" } }}
      className="aspect-auto h-64 w-full"
    >
      <BarChart data={s.data} stackOffset="sign" margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="year" ticks={FIVE_YEARS} {...axis} />
        <YAxis width={48} tickFormatter={s.tick} {...axis} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<Tip value={(v) => s.tip(v as number)} />} />
        <Bar dataKey="up" name={s.up} stackId="a" fill="var(--color-up)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="down" name={s.down} stackId="a" fill="var(--color-down)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

const soilData = soilYears.map((h) => ({ year: h.year, soil: h.soilMoisture }));

export function SoilMoistureChart() {
  return (
    <ChartContainer config={{ soil: { label: "Root-zone soil moisture", color: "var(--chart-3)" } }} className="aspect-auto h-64 w-full">
      <AreaChart data={soilData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <defs>
          <linearGradient id="fill-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-soil)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-soil)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="year" {...axis} />
        <YAxis width={44} domain={[0.27, 0.35]} tickFormatter={(v: number) => v.toFixed(2)} {...axis} />
        <Tooltip content={<Tip value={(v) => (v as number).toFixed(3) + " m³/m³"} />} />
        <Area dataKey="soil" name="Root-zone soil moisture" type="monotone" baseValue="dataMin" fill="url(#fill-soil)" stroke="var(--color-soil)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-soil)", strokeWidth: 0 }} />
      </AreaChart>
    </ChartContainer>
  );
}

/* Small trend line for a stat card. No axes; the card's number carries the value. */
export function Sparkline({ values, color = "var(--chart-1)" }: { values: number[]; color?: string }) {
  const id = "spark-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <ChartContainer config={{ v: { color } }} className="aspect-auto h-12 w-full">
      <AreaChart data={values.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area dataKey="v" type="monotone" baseValue="dataMin" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}
