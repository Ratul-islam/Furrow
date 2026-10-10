"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/components/dashboard-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <DashboardProvider>{children}</DashboardProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
