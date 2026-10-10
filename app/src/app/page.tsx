"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical, Sprout } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeDonut } from "@/components/charts/backtest-charts";
import { FanChart } from "@/components/charts/projection-charts";
import { CompareBars, WorstRegretBars } from "@/components/charts/rotation-charts";
import { SensorChart } from "@/components/charts/sensor-chart";
import { useDashboard } from "@/components/dashboard-context";
import { PrioritiesCard } from "@/components/priorities";
import { FamilyLegend, RotationTimeline } from "@/components/rotation-timeline";
import { SourceNote, StatCard } from "@/components/stat-card";
import { models, scenarios } from "@/lib/sample-data";
import { mmRange, one, range10, signed, whole } from "@/lib/format";

function DetailsLink({ href, label }: { href: string; label: string }) {
  return (
    <CardAction>
      <Button variant="ghost" size="sm" asChild>
        <Link href={href}>
          {label}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </CardAction>
  );
}

export default function OverviewPage() {
  const { horizon, ranking, pick, runner, current } = useDashboard();
  const n = ranking.futures.length;
  const same = pick === current;
  const runnerWins = runner.combined.filter((v, k) => v > pick.combined[k]).length;
  const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
  const irrigationChange = (mid(pick.irrigation) / mid(current.irrigation) - 1) * 100;

  return (
    <>
      <Alert>
        <FlaskConical />
        <AlertTitle>This dashboard runs on sample data</AlertTitle>
        <AlertDescription>
          Every number is a placeholder that shows how the tool works. None of it is a result. Real NASA data replaces it section by section.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="relative xl:col-span-2">
          <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-primary/15 blur-3xl" />
          <CardHeader>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge>
                <Sprout data-icon="inline-start" />
                Lowest regret
              </Badge>
              Recommended rotation for the {horizon.label}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{pick.rotation.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            <RotationTimeline rotation={pick.rotation} />
            <FamilyLegend />
            <div className="flex max-w-3xl flex-col gap-2">
              <p className="text-sm leading-relaxed">
                It is never more than <strong>{one(pick.worstRegret)} points</strong> behind the best rotation in any of the {n} climate futures tested for the {horizon.label}.
                {same && " This is the rotation the farm already follows."}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Runner-up: {runner.rotation.name}. It scores higher in {runnerWins} of {n} futures, but falls {one(runner.worstRegret)} points behind in its worst case.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button asChild>
              <Link href="/rotations">
                Compare all rotations
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/card">Open the Adaptation Card</Link>
            </Button>
          </CardFooter>
        </Card>

        <PrioritiesCard />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Worst-case regret" value={one(pick.worstRegret)} unit="points of 100"
          badge={`Lowest of ${ranking.rows.length}`} note={`Across ${n} climate futures: ${models.length} models, ${scenarios.length} scenarios`}
        />
        <StatCard
          label="Irrigation a year" value={range10(pick.irrigation)} unit="mm"
          badge={same ? undefined : `${signed(irrigationChange)}% vs current`} note={`Current rotation: ${mmRange(current.irrigation)}`}
        />
        <StatCard
          label="Soil-health indicator" value={whole(pick.median.soil)} unit="of 100"
          badge={same ? undefined : `${signed(pick.median.soil - current.median.soil)} vs current`} note={`Current rotation: ${whole(current.median.soil)} of 100`}
        />
        <StatCard
          label="Climate resilience" value={whole(pick.median.climate)} unit="of 100"
          badge={same ? undefined : `${signed(pick.median.climate - current.median.climate)} vs current`} note={`Current rotation: ${whole(current.median.climate)} of 100`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>What shifts next: temperature to 2060</CardTitle>
            <CardDescription>Difference from the 2000–2025 average, in °C</CardDescription>
            <DetailsLink href="/projections" label="All projections" />
          </CardHeader>
          <CardContent>
            <FanChart className="h-72" />
          </CardContent>
          <CardFooter><SourceNote>Real source: NASA NEX-GDDP-CMIP6, bias-adjusted against local history.</SourceNote></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended against current</CardTitle>
            <CardDescription>Score out of 100; higher is better</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareBars />
          </CardContent>
          <CardFooter><SourceNote>Middle value across the {n} climate futures.</SourceNote></CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Worst-case regret by rotation</CardTitle>
            <CardDescription>Points behind the best rotation; shorter is better</CardDescription>
            <DetailsLink href="/rotations" label="Details" />
          </CardHeader>
          <CardContent>
            <WorstRegretBars />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backtest, 2000 to 2025</CardTitle>
            <CardDescription>Did the stress score flag the poor crop years?</CardDescription>
            <DetailsLink href="/backtest" label="Details" />
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <OutcomeDonut />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Field sensor, last 14 days</CardTitle>
            <CardDescription>Soil moisture in the field against the satellite</CardDescription>
            <DetailsLink href="/sensor" label="Details" />
          </CardHeader>
          <CardContent>
            <SensorChart compact />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
