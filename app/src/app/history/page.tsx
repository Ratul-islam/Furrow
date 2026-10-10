import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AnomalyBars, SoilMoistureChart, Sparkline, TempTrendChart } from "@/components/charts/history-charts";
import { LegendRow } from "@/components/charts/tip";
import { PageIntro, SourceNote, StatCard } from "@/components/stat-card";
import { history } from "@/lib/sample-data";
import { ndviTrend, rainTrend, seasonTrend, soilMean, soilYears, tempTrend } from "@/lib/derived";
import { signed } from "@/lib/format";

export default function HistoryPage() {
  return (
    <>
      <PageIntro title="What has shifted" description="Twenty-five years at this location, 2000 to 2025: temperature, rainfall, growing season, soil moisture and crop greenness." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Temperature" value={`${signed(tempTrend.slope, 2)} °C`} unit="per decade" note="NASA POWER">
          <Sparkline values={history.map((h) => h.tempAnom)} />
        </StatCard>
        <StatCard label="Monsoon rainfall" value={`${signed(rainTrend.slope, 1)} %`} unit="per decade" note="GPM IMERG">
          <Sparkline values={history.map((h) => h.rainAnomPct)} />
        </StatCard>
        <StatCard label="Growing season" value={`${signed(seasonTrend.slope, 1)} days`} unit="per decade" note="NASA POWER">
          <Sparkline values={history.map((h) => h.seasonDays)} />
        </StatCard>
        <StatCard label="Root-zone soil moisture" value={soilMean.toFixed(2)} unit="m³/m³" note="SMAP L4, 2015–2025 average">
          <Sparkline values={soilYears.map((h) => h.soilMoisture as number)} color="var(--chart-3)" />
        </StatCard>
        <StatCard label="Crop greenness (NDVI)" value={signed(ndviTrend.slope, 3)} unit="per decade" note="MODIS MOD13Q1">
          <Sparkline values={history.map((h) => h.ndviAnom)} />
        </StatCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yearly temperature</CardTitle>
            <CardDescription>Difference from the 2000–2025 average, in °C</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <LegendRow items={[{ label: "Yearly value", color: "var(--chart-1)", kind: "line" }, { label: "Trend", color: "var(--chart-neutral)", kind: "line" }]} />
            <TempTrendChart />
          </CardContent>
          <CardFooter><SourceNote>Real source: NASA POWER, daily T2M.</SourceNote></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monsoon rainfall</CardTitle>
            <CardDescription>Difference from the 2000–2025 average, in %</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <LegendRow items={[{ label: "Wetter than average", color: "var(--chart-1)" }, { label: "Drier than average", color: "var(--chart-negative)" }]} />
            <AnomalyBars series="rain" />
          </CardContent>
          <CardFooter><SourceNote>Real source: GPM IMERG Final Run, GPM_3IMERGDF v07.</SourceNote></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Root-zone soil moisture</CardTitle>
            <CardDescription>Growing-season average, in m³ of water per m³ of soil. The record starts in 2015</CardDescription>
          </CardHeader>
          <CardContent>
            <SoilMoistureChart />
          </CardContent>
          <CardFooter><SourceNote>Real source: SMAP L4, SPL4SMGP v8, 9 km.</SourceNote></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crop greenness</CardTitle>
            <CardDescription>Peak-season NDVI, difference from the 2000–2025 average</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <LegendRow items={[{ label: "Greener than average", color: "var(--chart-1)" }, { label: "Less green than average", color: "var(--chart-negative)" }]} />
            <AnomalyBars series="ndvi" />
          </CardContent>
          <CardFooter><SourceNote>Real source: MODIS MOD13Q1 v061, 250 m.</SourceNote></CardFooter>
        </Card>
      </div>
    </>
  );
}
