import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SensorChart } from "@/components/charts/sensor-chart";
import { PageIntro, StatCard } from "@/components/stat-card";
import { sensor, soil } from "@/lib/sample-data";
import { sensorBias, sensorR } from "@/lib/derived";
import { signed } from "@/lib/format";

export default function SensorPage() {
  return (
    <>
      <PageIntro
        title="Field sensor"
        description="A low-cost node in the field measures soil moisture at two depths. It is compared with the satellite estimate for the same place, and it feeds the farm’s own soil information into the advice."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bias against the satellite" value={signed(sensorBias, 3)} unit="m³/m³" note="Sensor at 30 cm minus satellite root zone" />
        <StatCard label="Agreement" value={`r = ${sensorR.toFixed(2)}`} note="Sensor at 30 cm against satellite" />
        <StatCard label="Readings received" value={`${sensor.length} of ${sensor.length}`} note="Every 6 hours for 14 days" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Soil moisture, last 14 days</CardTitle>
            <CardDescription>m³ of water per m³ of soil. The two jumps are rain</CardDescription>
          </CardHeader>
          <CardContent>
            <SensorChart />
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Sample values. A point sensor against a 9 km satellite cell shows agreement or bias. It is not validation. Satellite source: SMAP L4, SPL4SMGP v8.
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Soil profile</CardTitle>
            <CardDescription>What the tool knows about this field’s soil</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              {soil.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="font-medium tabular-nums">
                    {s.value}
                    {s.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{s.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">Sample values. Real source: open soil map, plus a soil test the farmer types in.</p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
