"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompareBars, RegretStrip } from "@/components/charts/rotation-charts";
import { useDashboard } from "@/components/dashboard-context";
import { PrioritiesCard } from "@/components/priorities";
import { FamilyLegend, RotationTimeline } from "@/components/rotation-timeline";
import { PageIntro, SourceNote } from "@/components/stat-card";
import { CRITERIA } from "@/lib/engine";
import { crops, families, type CropId } from "@/lib/sample-data";
import { mmRange, one } from "@/lib/format";

export default function RotationsPage() {
  const { horizon, ranking, pick, runner, current } = useDashboard();
  const n = ranking.futures.length;

  return (
    <>
      <PageIntro
        title="Compare rotations"
        description={`${ranking.rows.length} rotations, each scored in ${n} climate futures for the ${horizon.label}. They are sorted by worst-case regret: how far a rotation can fall behind the best one.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ranking</CardTitle>
          <CardDescription>Scores run from 0 to 100; higher is better. Each score is the middle value across the climate futures</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FamilyLegend />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-72">Rotation</TableHead>
                {CRITERIA.map((c) => <TableHead key={c.id} className="min-w-32">{c.label}</TableHead>)}
                <TableHead className="text-right">Irrigation a year</TableHead>
                <TableHead className="text-right">Combined</TableHead>
                <TableHead className="text-right">Worst regret</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.rows.map((r) => (
                <TableRow key={r.rotation.id} data-state={r === pick ? "selected" : undefined}>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col gap-2 py-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{r.rotation.id}</span>
                        <span className="font-medium">{r.rotation.name}</span>
                        {r === pick && <Badge>Lowest regret</Badge>}
                        {r === runner && <Badge variant="secondary">Runner-up</Badge>}
                        {r === current && <Badge variant="outline">Current</Badge>}
                      </div>
                      <RotationTimeline rotation={r.rotation} variant="compact" className="max-w-sm" />
                    </div>
                  </TableCell>
                  {CRITERIA.map((c) => (
                    <TableCell key={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right tabular-nums">{Math.round(r.median[c.id])}</span>
                        <Progress value={r.median[c.id]} aria-label={`${c.label}: ${Math.round(r.median[c.id])} of 100`} className="w-20" />
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">{mmRange(r.irrigation)}</TableCell>
                  <TableCell className="text-right tabular-nums">{one(r.combinedMedian)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{one(r.worstRegret)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter><SourceNote>Scores come from the rotation engine; the ranking itself is computed live from your priorities.</SourceNote></CardFooter>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <PrioritiesCard />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Regret in each climate future</CardTitle>
            <CardDescription>Points behind the best rotation in that future. One dot per model and scenario; closer to zero is better</CardDescription>
          </CardHeader>
          <CardContent>
            <RegretStrip />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recommended against current</CardTitle>
            <CardDescription>Score out of 100; higher is better</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareBars />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Crops in these rotations</CardTitle>
            <CardDescription>The characteristics the scores are built from</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crop</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead className="text-right">Season, days</TableHead>
                  <TableHead className="text-right">Water need, mm</TableHead>
                  <TableHead className="text-right">Root depth, m</TableHead>
                  <TableHead className="text-right">Heat limit, °C</TableHead>
                  <TableHead>Residue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(crops) as CropId[]).filter((id) => id !== "fallow").map((id) => {
                  const c = crops[id];
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-[3px]" style={{ background: `var(--fam-${c.family})` }} />
                          {families[c.family].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.days}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.waterMm}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.rootM.toFixed(1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.heatC}</TableCell>
                      <TableCell>{c.residue}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter><SourceNote>Real source: FAO-56 (Allen et al. 1998) and local extension guides.</SourceNote></CardFooter>
        </Card>
      </div>
    </>
  );
}
