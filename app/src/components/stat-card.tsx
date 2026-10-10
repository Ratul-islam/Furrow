import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* One headline number with its unit, an optional comparison badge and an optional sparkline. */
export function StatCard({ label, value, unit, badge, note, children }: {
  label: string; value: string; unit?: string; badge?: string; note?: string; children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="flex flex-wrap items-baseline gap-x-1.5 text-2xl font-semibold tabular-nums">
          <span className="whitespace-nowrap">{value}</span>
          {unit && <span className="text-sm font-normal whitespace-nowrap text-muted-foreground">{unit}</span>}
        </CardTitle>
        {badge && (
          <CardAction>
            <Badge variant="secondary">{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {(children || note) && (
        <CardContent className="flex flex-col gap-2">
          {children}
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </CardContent>
      )}
    </Card>
  );
}

export function PageIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/* Footer line under a chart: says the numbers are samples and names the real source. */
export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">Sample values. {children}</p>;
}
