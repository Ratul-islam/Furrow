import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BacktestScatter } from "@/components/charts/backtest-charts";
import { PageIntro, SourceNote, StatCard } from "@/components/stat-card";
import { outcomes } from "@/lib/engine";
import { OUTCOME, backtestCounts as BT, wrongYears } from "@/lib/derived";
import { signed } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function BacktestPage() {
  return (
    <>
      <PageIntro
        title="Backtest, 2000 to 2025"
        description="Would the climate stress score have flagged the years when crops did poorly? The misses are shown with the hits."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Poor crop years flagged" value={`${BT.hit} of ${BT.hit + BT.miss}`} note="The score was above the line and crops did poorly" />
        <StatCard label="Poor crop years missed" value={String(BT.miss)} note="Crops did poorly but the score stayed low" />
        <StatCard label="False alarms" value={String(BT.alarm)} note="The score was high but crops were fine" />
        <StatCard label="Normal years called correctly" value={`${BT.quiet} of ${BT.quiet + BT.alarm}`} note="The score stayed low and crops were fine" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stress score against crop greenness</CardTitle>
            <CardDescription>One dot per year. Greenness is the difference in peak-season NDVI from the 2000–2025 average</CardDescription>
          </CardHeader>
          <CardContent>
            <BacktestScatter />
          </CardContent>
          <CardFooter><SourceNote>Real sources: stress score from NASA POWER and IMERG; greenness from MODIS MOD13Q1.</SourceNote></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Year by year</CardTitle>
            <CardDescription>Each square is one year</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-13">
              {outcomes.map((y) => (
                <div
                  key={y.year} title={`${y.year}: ${OUTCOME[y.outcome].label}`}
                  className={cn("flex flex-col items-center gap-1 rounded-md border px-1 py-1.5", (y.outcome === "miss" || y.outcome === "alarm") && "bg-muted")}
                >
                  <span className="size-2.5 rounded-full" style={{ background: OUTCOME[y.outcome].color }} />
                  <span className="text-[11px] tabular-nums text-muted-foreground">’{String(y.year).slice(2)}</span>
                  <span className="sr-only">{OUTCOME[y.outcome].label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(["hit", "quiet", "miss", "alarm"] as const).map((o) => (
                <span key={o} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: OUTCOME[o].color }} />
                  {OUTCOME[o].label}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Years the score got wrong</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>What happened</TableHead>
                    <TableHead className="text-right">Stress score</TableHead>
                    <TableHead className="text-right">Greenness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wrongYears.map((y) => (
                    <TableRow key={y.year}>
                      <TableCell className="font-medium tabular-nums">{y.year}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ background: OUTCOME[y.outcome].color }} />
                          {OUTCOME[y.outcome].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{y.stressIndex}</TableCell>
                      <TableCell className="text-right tabular-nums">{signed(y.ndviAnom, 3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              The backtest covers the climate side only. Soil-health effects cannot be tested with 25 years of satellite data; they rest on published agronomy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
