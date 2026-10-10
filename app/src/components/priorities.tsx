"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useDashboard } from "@/components/dashboard-context";
import { CRITERIA, DEFAULT_WEIGHTS } from "@/lib/engine";

const HELP: Record<string, string> = {
  climate: "Less heat and drought stress on the crops",
  water: "Less irrigation needed each year",
  soil: "More legumes, soil cover and crop diversity",
  income: "Higher expected return",
};

export function PrioritiesCard({ className }: { className?: string }) {
  const { weights, setWeights } = useDashboard();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          What matters most
        </CardTitle>
        <CardDescription>Set the farmer’s priorities. The recommendation updates as you move a slider.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {CRITERIA.map((c) => (
          <div key={c.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <label id={`w-${c.id}`} className="text-sm font-medium">{c.label}</label>
              <span className="text-xs tabular-nums text-muted-foreground">{weights[c.id] === 0 ? "Not counted" : `${weights[c.id]} of 5`}</span>
            </div>
            <Slider
              aria-labelledby={`w-${c.id}`} min={0} max={5} step={1} value={[weights[c.id]]}
              onValueChange={([v]) => setWeights({ ...weights, [c.id]: v })}
            />
            <p className="text-xs text-muted-foreground">{HELP[c.id]}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
