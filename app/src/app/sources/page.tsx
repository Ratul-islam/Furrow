import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageIntro } from "@/components/stat-card";

const SOURCES = [
  { use: "Future climate", product: "NASA NEX-GDDP-CMIP6, 0.25°, daily, 1950–2100", ref: "DOI 10.7917/OFSG3345", href: "https://doi.org/10.7917/OFSG3345" },
  { use: "Future climate (paper)", product: "Thrasher et al. 2022, Scientific Data", ref: "DOI 10.1038/s41597-022-01393-4", href: "https://doi.org/10.1038/s41597-022-01393-4" },
  { use: "Daily weather history", product: "NASA POWER, Langley Research Center", ref: "power.larc.nasa.gov", href: "https://power.larc.nasa.gov" },
  { use: "Soil moisture", product: "SMAP L4 SPL4SMGP v8, 9 km", ref: "DOI 10.5067/T5RUATAQREF8", href: "https://doi.org/10.5067/T5RUATAQREF8" },
  { use: "Rainfall", product: "GPM IMERG Final Run daily, GPM_3IMERGDF v07", ref: "DOI 10.5067/GPM/IMERGDF/DAY/07", href: "https://doi.org/10.5067/GPM/IMERGDF/DAY/07" },
  { use: "Vegetation", product: "MODIS MOD13Q1 v061, 250 m, 16-day", ref: "DOI 10.5067/MODIS/MOD13Q1.061", href: "https://doi.org/10.5067/MODIS/MOD13Q1.061" },
  { use: "Crop water needs", product: "Allen et al. 1998, Crop evapotranspiration, FAO Irrigation and Drainage Paper 56", ref: "FAO-56", href: undefined },
];

export default function SourcesPage() {
  return (
    <>
      <PageIntro title="Sources" description="Where the real data will come from. Today the dashboard shows sample values only." />
      <Card>
        <CardHeader>
          <CardTitle>Data and methods</CardTitle>
          <CardDescription>Soil map and crop table sources for the pilot region are still being selected; only openly licensed sources will be used</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Used for</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SOURCES.map((s) => (
                <TableRow key={s.use}>
                  <TableCell className="font-medium">{s.use}</TableCell>
                  <TableCell className="whitespace-normal">{s.product}</TableCell>
                  <TableCell>
                    {s.href ? <a className="underline underline-offset-4 hover:text-primary" href={s.href}>{s.ref}</a> : s.ref}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Furrow. NASA Space Apps Challenge 2026, Field Shift: Adapting Farms with NASA Data. Apache License 2.0.</p>
    </>
  );
}
