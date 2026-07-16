"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Globe,
  MapPin,
  Building2,
  Car,
  Map,
  BookOpen,
  LayoutGrid,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WEBSITE_MODULES } from "@/lib/constants/package-options";
import { websiteModuleVisibility } from "@/lib/data/website-content";
import type { WebsiteModuleVisibility } from "@/types/database";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  countries: Globe,
  destinations: MapPin,
  cities: Building2,
  packages: Map,
  hotels: Building2,
  vehicles: Car,
  blogs: BookOpen,
};

const LINKS: Record<string, string> = {
  countries: "/master-data/countries",
  destinations: "/master-data/destinations",
  cities: "/master-data/cities",
  packages: "/itineraries",
  hotels: "/master-data/hotels",
  vehicles: "/master-data/vehicles",
  blogs: "/blogs",
};

export function WebsiteWidgets() {
  const { show } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [modules, setModules] = useState<WebsiteModuleVisibility[]>(websiteModuleVisibility);

  function toggleModule(module: string, showOnWebsite: boolean) {
    setModules((prev) =>
      prev.map((m) => (m.module === module ? { ...m, show_on_website: showOnWebsite } : m))
    );
    const label = modules.find((m) => m.module === module)?.label;
    show(`${label} ${showOnWebsite ? "visible" : "hidden"} on website`);
  }

  return (
    <Card className="border-stone-200/80 shadow-sm">
      <CardHeader
        className="cursor-pointer select-none pb-4 transition-colors hover:bg-stone-50/80 sm:pb-6"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse website display" : "Expand website display"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <ChevronDown
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0 text-stone-400 transition-transform duration-200",
                expanded && "rotate-180"
              )}
              aria-hidden
            />
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <LayoutGrid className="h-5 w-5 text-amber-600" />
                Website Display
              </CardTitle>
              <CardDescription>Toggle modules visible on the public website</CardDescription>
            </div>
          </div>
          <Link
            href="/website"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:underline sm:shrink-0"
          >
            Manage content <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {modules.map((mod) => {
            const meta = WEBSITE_MODULES.find((w) => w.key === mod.module);
            const Icon = ICONS[mod.module] ?? Globe;
            return (
              <div
                key={mod.module}
                className={cn(
                  "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-md transition-opacity",
                  meta?.color ?? "from-stone-500 to-stone-600",
                  !mod.show_on_website && "opacity-60"
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Toggle
                    checked={mod.show_on_website}
                    onChange={(v) => toggleModule(mod.module, v)}
                    className="[&_button]:h-5 [&_button]:w-9 [&_span]:h-4 [&_span]:w-4 [&_span]:translate-x-0 [&_button[aria-checked=true]_span]:translate-x-4"
                  />
                </div>
                <Link href={LINKS[mod.module] ?? "/website"} className="block hover:underline">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/80">{mod.label}</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">{mod.count}</p>
                </Link>
              </div>
            );
          })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
