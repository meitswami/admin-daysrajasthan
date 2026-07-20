"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPeriodToolbar } from "@/components/dashboard/period-toolbar";
import {
  formatInrCompact,
  getItineraryBuilderMetricsFromSeed,
  getItineraryBuilderMetricsLive,
  type ItineraryBuilderMetrics,
} from "@/lib/itinerary-builder/metrics";
import { exportItineraryBuilderCsv } from "@/lib/dashboard/export";
import type { DashboardPeriod } from "@/lib/utils/date-range";
import { Route, IndianRupee, Clock, CheckCircle2, Package } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ItineraryBuilderStats() {
  const { show } = useToast();
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const custom = useMemo(() => ({ from: customFrom, to: customTo }), [customFrom, customTo]);
  const [metrics, setMetrics] = useState<ItineraryBuilderMetrics>(() =>
    getItineraryBuilderMetricsFromSeed("all")
  );

  useEffect(() => {
    setMetrics(getItineraryBuilderMetricsLive(period, custom));
  }, [period, custom]);

  useEffect(() => {
    void import("@/lib/system/data-mode").then(({ isRealDataMode }) => {
      if (!isRealDataMode()) {
        setMetrics(getItineraryBuilderMetricsLive(period, custom));
        return;
      }
      void import("@/lib/itinerary-builder/sync-real").then(({ hydrateItineraryBuilderFromSupabaseIfReal }) =>
        hydrateItineraryBuilderFromSupabaseIfReal().then(() => {
          setMetrics(getItineraryBuilderMetricsLive(period, custom));
        })
      );
    });
  }, [period, custom]);

  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Route className="h-5 w-5 text-amber-600" />
              Itinerary Builder
            </CardTitle>
            <CardDescription>
              Client quotes only (excludes website package catalog) — filter by created date
            </CardDescription>
          </div>
          <Link
            href="/itinerary-builder"
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            Open pipeline →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DashboardPeriodToolbar
          period={period}
          onPeriodChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          onExport={() => {
            exportItineraryBuilderCsv(period, custom);
            show("Itinerary Builder CSV downloaded");
          }}
          exportLabel="Export quotes CSV"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Quotes"
            value={metrics.totalQuotes}
            icon={Route}
            className="border-amber-100/80 bg-white/80"
          />
          <StatCard
            label="Pending"
            value={metrics.pendingQuotes}
            icon={Clock}
            className="border-amber-100/80 bg-white/80"
          />
          <StatCard
            label="Booking Value"
            value={formatInrCompact(metrics.totalBookingValue)}
            icon={IndianRupee}
            className="border-amber-100/80 bg-white/80"
          />
          <StatCard
            label="Confirmed Revenue"
            value={formatInrCompact(metrics.totalRevenue)}
            icon={CheckCircle2}
            className="border-amber-100/80 bg-white/80"
          />
          <StatCard
            label="Tour Codes Used"
            value={metrics.activePackages}
            icon={Package}
            className="col-span-2 border-amber-100/80 bg-white/80 sm:col-span-1"
          />
        </div>
        <p className="text-xs text-stone-500">
          Unpaid pending: {metrics.unpaidQuotes} · Updates when you save quotes in Itinerary Builder
        </p>
      </CardContent>
    </Card>
  );
}
