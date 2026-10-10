"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, CloudSun, History, LayoutDashboard, Radio, Repeat, Smartphone, Target, type LucideIcon,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";

export const NAV: { label: string; items: { href: string; title: string; icon: LucideIcon }[] }[] = [
  {
    label: "Decide",
    items: [
      { href: "/", title: "Overview", icon: LayoutDashboard },
      { href: "/rotations", title: "Compare rotations", icon: Repeat },
      { href: "/card", title: "Adaptation Card", icon: Smartphone },
    ],
  },
  {
    label: "Evidence",
    items: [
      { href: "/history", title: "What has shifted", icon: History },
      { href: "/projections", title: "What shifts next", icon: CloudSun },
      { href: "/backtest", title: "Backtest", icon: Target },
      { href: "/sensor", title: "Field sensor", icon: Radio },
    ],
  },
  {
    label: "Reference",
    items: [{ href: "/sources", title: "Sources", icon: BookOpen }],
  },
];

export function pageTitle(pathname: string) {
  for (const group of NAV) for (const item of group.items) if (item.href === pathname) return item.title;
  return "Overview";
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                    <path d="M3 7c5-3 9 3 18 0M3 12c5-3 9 3 18 0M3 17c5-3 9 3 18 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-base font-semibold">Furrow</span>
                  <span className="truncate text-xs text-muted-foreground">Rotation decision support</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Decision support, not a forecast. NASA Space Apps Challenge 2026.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
