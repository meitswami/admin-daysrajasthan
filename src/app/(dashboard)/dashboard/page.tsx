"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { PageMain } from "@/components/ui/data-table";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { BulkCrmSync } from "@/components/dashboard/bulk-crm-sync";
import { WebsiteWidgets } from "@/components/dashboard/website-widgets";
import { ItineraryBuilderStats } from "@/components/dashboard/itinerary-builder-stats";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { CrmSyncPanel } from "@/components/dashboard/crm-sync-panel";
import { fetchDashboardStatsByPeriodLive } from "@/lib/data/dashboard-stats";
import { useSystem } from "@/components/providers/system-provider";

export default function DashboardPage() {
  const { dataMode, can } = useSystem();
  const [chartData, setChartData] = useState([
    { label: "Inquiries", value: 0, color: "#d97706" },
    { label: "Itinerary Downloads", value: 0, color: "#059669" },
    { label: "Contacts", value: 0, color: "#0284c7" },
    { label: "WhatsApp", value: 0, color: "#16a34a" },
    { label: "Blogs", value: 0, color: "#7c3aed" },
  ]);

  const showWebsiteWidgets = useMemo(() => can("website.view"), [can, dataMode]);

  useEffect(() => {
    let cancelled = false;
    void fetchDashboardStatsByPeriodLive("all").then((stats) => {
      if (cancelled) return;
      setChartData([
        { label: "Inquiries", value: stats.totalInquiries, color: "#d97706" },
        { label: "Itinerary Downloads", value: stats.totalItineraryDownloads, color: "#059669" },
        { label: "Contacts", value: stats.totalContactQueries, color: "#0284c7" },
        { label: "WhatsApp", value: stats.totalWhatsappLeads, color: "#16a34a" },
        { label: "Blogs", value: stats.totalBlogs, color: "#7c3aed" },
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  return (
    <>
      <Header title="Dashboard" description="Live Supabase activity — bookings, inquiries & leads" />
      <PageMain>
        <DashboardStats />

        <ItineraryBuilderStats />

        {showWebsiteWidgets && <WebsiteWidgets />}

        <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
          <RecentActivityPanel />

          <div className="space-y-4 lg:col-span-2">
            <ActivityChart data={chartData} />
            <AiInsightsPanel />
            <BulkCrmSync />
            <CrmSyncPanel />
          </div>
        </div>
      </PageMain>
    </>
  );
}
