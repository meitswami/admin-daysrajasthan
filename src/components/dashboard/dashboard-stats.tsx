"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardPeriodToolbar } from "@/components/dashboard/period-toolbar";
import { getDashboardStatsByPeriod, getInquiryTrendLabel } from "@/lib/data/dashboard-stats";
import { exportWebsiteDashboardCsv } from "@/lib/dashboard/export";
import type { DashboardPeriod } from "@/lib/utils/date-range";
import { MessageSquare, FileQuestion, Download, BookOpen, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function DashboardStats() {
  const { show } = useToast();
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const custom = { from: customFrom, to: customTo };

  const stats = useMemo(() => getDashboardStatsByPeriod(period, custom), [period, customFrom, customTo]);
  const inquiryTrend = useMemo(() => getInquiryTrendLabel(period), [period]);

  return (
    <div className="space-y-3">
      <DashboardPeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onExport={() => {
          exportWebsiteDashboardCsv(period, custom);
          show("Website dashboard CSV downloaded");
        }}
        exportLabel="Export website CSV"
      />

      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Contact Queries" value={stats.totalContactQueries} icon={MessageSquare} />
        <StatCard label="Inquiries" value={stats.totalInquiries} icon={FileQuestion} trend={inquiryTrend} />
        <StatCard label="Itinerary Downloads" value={stats.totalItineraryDownloads} icon={Download} />
        <StatCard label="Published Blogs" value={stats.totalBlogs} icon={BookOpen} />
        <StatCard
          label="WhatsApp Leads"
          value={stats.totalWhatsappLeads}
          icon={MessageCircle}
          className="col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
}
