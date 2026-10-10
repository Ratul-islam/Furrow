"use client";

import { Languages, MessageSquareQuote, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useDashboard } from "@/components/dashboard-context";
import { RotationTimeline } from "@/components/rotation-timeline";
import { PageIntro } from "@/components/stat-card";
import { farm } from "@/lib/sample-data";
import { mmRange, one, whole } from "@/lib/format";

export default function CardPage() {
  const { horizon, ranking, pick, current } = useDashboard();
  const n = ranking.futures.length;
  const same = pick === current;

  return (
    <>
      <div className="no-print">
        <PageIntro title="Adaptation Card" description="One page for the farmer’s phone, to share as an image or PDF. It follows the recommendation and priorities set on the overview." />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="rounded-[2.25rem] border-8 border-foreground/85 bg-card p-5 shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{farm.name}, plan for the {horizon.label}</span>
              <h2 className="text-xl font-semibold tracking-tight text-balance">{pick.rotation.name}</h2>
            </div>
            <RotationTimeline rotation={pick.rotation} variant="stacked" />
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
              <li>Stays within {one(pick.worstRegret)} points of the best choice in all {n} climate futures tested.</li>
              <li>Needs about {mmRange(pick.irrigation)} of irrigation a year.{!same && ` Your current rotation needs ${mmRange(current.irrigation)}.`}</li>
              <li>Soil-health indicator: {whole(pick.median.soil)} of 100.{!same && ` Your current rotation: ${whole(current.median.soil)}.`}</li>
            </ul>
            <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Decision support, not a forecast. Sample data. Scenarios: SSP2-4.5 and SSP5-8.5. Sources: NASA NEX-GDDP-CMIP6, POWER, SMAP, GPM IMERG, MODIS.
            </p>
          </div>
        </div>

        <div className="no-print flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Share the card</CardTitle>
              <CardDescription>Opens the print dialog with only the card on the page. Choose “Save as PDF” to send it by phone.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.print()}>
                <Printer data-icon="inline-start" />
                Print or save as PDF
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Languages /></EmptyMedia>
                <EmptyTitle>No local-language version yet</EmptyTitle>
                <EmptyDescription>It is added after a native speaker has reviewed every line.</EmptyDescription>
              </EmptyHeader>
            </Empty>
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><MessageSquareQuote /></EmptyMedia>
                <EmptyTitle>No local reality check yet</EmptyTitle>
                <EmptyDescription>A farmer or extension officer reviews this advice during the event. Their comment is quoted here as given.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </div>
    </>
  );
}
