"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { FlaskConical, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { pageTitle } from "@/components/app-sidebar";
import { useDashboard } from "@/components/dashboard-context";
import { farm, horizons } from "@/lib/sample-data";

export function SiteHeader() {
  const pathname = usePathname();
  const { horizon, setHorizon } = useDashboard();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="truncate text-sm font-semibold">{pageTitle(pathname)}</h1>
        <span className="hidden truncate text-sm text-muted-foreground md:inline">{farm.name}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="hidden sm:inline-flex">
              <FlaskConical data-icon="inline-start" />
              Sample data
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Every number is a placeholder, not a result.</TooltipContent>
        </Tooltip>

        <span id="horizon-label" className="hidden text-sm text-muted-foreground lg:inline">Plan for the</span>
        <ToggleGroup
          type="single" variant="outline" size="sm" spacing={0} aria-labelledby="horizon-label"
          value={horizon.id} onValueChange={(v) => { if (v) setHorizon(v); }}
        >
          {horizons.map((h) => <ToggleGroupItem key={h.id} value={h.id}>{h.label}</ToggleGroupItem>)}
        </ToggleGroup>

        <Button
          variant="ghost" size="icon-sm" aria-label="Switch between light and dark"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </div>
    </header>
  );
}
