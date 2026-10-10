import { cn } from "@/lib/utils";
import { crops, families, seasons, type FamilyId, type Rotation } from "@/lib/sample-data";

const familyStyle = (id: FamilyId) => ({ background: `var(--fam-${id})`, color: `var(--fam-${id}-ink)` });

/* A rotation drawn as season blocks, coloured by crop family. Every block also names its crop.
   full: three years, each with season labels. compact: each distinct yearly pattern once. */
export function RotationTimeline({ rotation, variant = "full", className }: {
  rotation: Rotation; variant?: "full" | "stacked" | "compact"; className?: string;
}) {
  const alternates = rotation.years.length > 1;
  const patterns = variant === "compact" ? rotation.years : [0, 1, 2].map((i) => rotation.years[i % rotation.years.length]);

  return (
    <div className={cn("grid gap-3", variant === "full" && "md:grid-cols-3", variant === "compact" && "gap-1.5", className)}>
      {patterns.map((pattern, yi) => (
        <div key={yi} className="flex min-w-0 flex-col gap-1.5">
          {variant !== "compact" && <span className="text-xs font-medium text-muted-foreground">Year {yi + 1}</span>}
          {variant === "compact" && alternates && <span className="text-[11px] text-muted-foreground">{yi === 0 ? "Odd years" : "Even years"}</span>}
          <div className="print-exact grid flex-1 grid-cols-3 gap-0.5 overflow-hidden rounded-lg">
            {pattern.map((cropId, si) => {
              const crop = crops[cropId];
              return (
                <div
                  key={si}
                  title={`${seasons[si]}: ${crop.name}`}
                  style={familyStyle(crop.family)}
                  className={cn("flex min-w-0 flex-col justify-center px-2 text-center", variant === "compact" ? "py-1.5 text-xs font-medium" : "py-2.5 text-sm font-semibold")}
                >
                  <span className="leading-tight text-balance">{crop.short}</span>
                  {variant !== "compact" && <span className="text-[11px] leading-tight font-normal">{seasons[si]}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FamilyLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {(Object.keys(families) as FamilyId[]).map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: `var(--fam-${id})` }} />
          {families[id].label}
        </span>
      ))}
    </div>
  );
}
