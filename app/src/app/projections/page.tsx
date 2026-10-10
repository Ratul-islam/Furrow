"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FanChart, RangeRows } from "@/components/charts/projection-charts";
import { useDashboard } from "@/components/dashboard-context";
import { PageIntro, SourceNote } from "@/components/stat-card";
import { models } from "@/lib/sample-data";
import { METRICS } from "@/lib/derived";

export default function ProjectionsPage() {
  const { horizon } = useDashboard();

  return (
    <>
      <PageIntro
        title="What shifts next"
        description={`${models.length} climate models under two emissions scenarios. Every projection is shown as the spread across models, not as one answer. Use the switch at the top to change the decade.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Temperature to 2060</CardTitle>
          <CardDescription>Difference from the 2000–2025 average, in °C</CardDescription>
        </CardHeader>
        <CardContent>
          <FanChart className="h-96" />
        </CardContent>
        <CardFooter><SourceNote>Real source: NASA NEX-GDDP-CMIP6, 0.25°, bias-adjusted against local history.</SourceNote></CardFooter>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.key}>
            <CardHeader>
              <CardTitle>{m.title}, {horizon.label}</CardTitle>
              <CardDescription>{m.sub}</CardDescription>
            </CardHeader>
            <CardContent>
              <RangeRows metric={m.key} />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Bar: the range most models fall in. Dot: the middle model. Sample values. Scenarios: SSP2-4.5 (middle emissions) and SSP5-8.5 (very high emissions).
      </p>
    </>
  );
}
