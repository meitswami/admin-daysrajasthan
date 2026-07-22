"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardPeriodToolbar } from "@/components/dashboard/period-toolbar";
import { fetchDashboardStatsByPeriodLive } from "@/lib/data/dashboard-stats";
import { exportWebsiteDashboardCsv } from "@/lib/dashboard/export";
import type { DashboardPeriod } from "@/lib/utils/date-range";
import type { DashboardStats } from "@/types/database";
import { MessageSquare, FileQuestion, Download, BookOpen, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";

const EMPTY: DashboardStats = {
  totalContactQueries: 0,
  totalInquiries: 0,
  totalItineraryDownloads: 0,
  totalBlogs: 0,
  totalWhatsappLeads: 0,
};

const TREND = "↗ +0% from last month";

export function DashboardStats() {
  const { show } = useToast();
  const { dataMode } = useSystem();
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const custom = useMemo(() => ({ from: customFrom, to: customTo }), [customFrom, customTo]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    void fetchDashboardStatsByPeriodLive(period, custom).then((next) => {
      if (!cancelled) setStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [period, custom, dataMode]);

  return (
    <div className="space-y-4">
      <DashboardPeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onExport={() => {
          void exportWebsiteDashboardCsv(period, custom).then(() =>
            show("Website dashboard CSV downloaded")
          );
        }}
        exportLabel="Export website CSV"
      />

      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Contact Queries"
          value={stats.totalContactQueries}
          icon={MessageSquare}
          tone="blue"
          trend={TREND}
        />
        <StatCard
          label="Inquiries"
          value={stats.totalInquiries}
          icon={FileQuestion}
          tone="purple"
          trend={TREND}
        />
        <StatCard
          label="Itinerary Downloads"
          value={stats.totalItineraryDownloads}
          icon={Download}
          tone="amber"
          trend={TREND}
        />
        <StatCard
          label="Published Blogs"
          value={stats.totalBlogs}
          icon={BookOpen}
          tone="orange"
          trend={TREND}
        />
        <StatCard
          label="WhatsApp Leads"
          value={stats.totalWhatsappLeads}
          icon={MessageCircle}
          tone="green"
          trend={TREND}
          className="col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
}
