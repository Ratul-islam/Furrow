import type { ReactNode } from "react";

export interface TipItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | number[] | null;
  color?: string;
  payload?: Record<string, unknown>;
}

/* Tooltip body shared by every chart. Recharts fills in active, payload and label. */
export function Tip({ active, payload, label, title, value, names, colors, hide }: {
  active?: boolean;
  payload?: TipItem[];
  label?: string | number;
  title?: (label: string | number | undefined, payload: TipItem[]) => ReactNode;
  value?: (v: number | number[], item: TipItem) => string;
  names?: Record<string, string>;
  colors?: Record<string, string>;
  hide?: string[];
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && !(hide ?? []).includes(String(p.dataKey)));
  if (!rows.length) return null;

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <div className="font-medium">{title ? title(label, payload) : label}</div>
      {rows.map((p) => {
        const key = String(p.dataKey);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: colors?.[key] ?? p.color }} />
            <span className="text-muted-foreground">{names?.[key] ?? p.name}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums">
              {value && typeof p.value !== "string" ? value(p.value as number | number[], p) : String(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Legend row above a chart. Marks carry the colour; the text stays in ink. */
export function LegendRow({ items }: { items: { label: string; color: string; kind?: "line" | "dot" | "band" | "ring" }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.kind === "line" && <span className="h-0.5 w-4 rounded-full" style={{ background: it.color }} />}
          {it.kind === "band" && <span className="h-2.5 w-4 rounded-[3px] opacity-30" style={{ background: it.color }} />}
          {it.kind === "ring" && <span className="size-2.5 rounded-full border-2" style={{ borderColor: it.color }} />}
          {(!it.kind || it.kind === "dot") && <span className="size-2.5 rounded-full" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}
