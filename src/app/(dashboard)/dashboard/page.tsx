import { Header } from "@/components/layout/header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageMain } from "@/components/ui/data-table";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { BulkCrmSync } from "@/components/dashboard/bulk-crm-sync";
import { WebsiteWidgets } from "@/components/dashboard/website-widgets";
import { ItineraryBuilderStats } from "@/components/dashboard/itinerary-builder-stats";
import { formatDateTime } from "@/lib/utils";
import { getDashboardStats, getRecentActivity, getLinkedCustomers } from "@/lib/data";
import { TrendingUp, Link2 } from "lucide-react";

export default function DashboardPage() {
  const stats = getDashboardStats();
  const activity = getRecentActivity();
  const linkedCustomers = getLinkedCustomers();

  const chartData = [
    { label: "Inquiries", value: stats.totalInquiries, color: "#d97706" },
    { label: "Itinerary Downloads", value: stats.totalItineraryDownloads, color: "#059669" },
    { label: "Contacts", value: stats.totalContactQueries, color: "#0284c7" },
    { label: "WhatsApp", value: stats.totalWhatsappLeads, color: "#16a34a" },
    { label: "Blogs", value: stats.totalBlogs, color: "#7c3aed" },
  ];

  return (
    <>
      <Header title="Dashboard" description="Website activity — inquiries, downloads, leads & blogs" />
      <PageMain>
        <DashboardStats />

        <ItineraryBuilderStats />

        <WebsiteWidgets />

        <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
          <Card className="border-stone-200/80 shadow-sm lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Linked across inquiries, downloads & WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-amber-700">{item.type}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-stone-900">{item.title}</p>
                    <p className="text-xs text-stone-500">{formatDateTime(item.time)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <ActivityChart data={chartData} />
            <AiInsightsPanel />
            <BulkCrmSync />

            <Card className="border-stone-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Link2 className="h-5 w-5 text-emerald-600" />
                  CRM Sync
                </CardTitle>
                <CardDescription>Customers in multiple modules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {linkedCustomers.slice(0, 4).map((row) => (
                  <div key={row.email} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-800">{row.name ?? row.email}</p>
                      <p className="text-xs text-stone-500">{row.touchpointCount} touchpoints</p>
                    </div>
                    <StatusBadge status={row.crmSynced ? "synced" : "pending"} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageMain>
    </>
  );
}
