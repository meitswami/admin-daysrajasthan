"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { useSystem } from "@/components/providers/system-provider";
import { TrendingUp } from "lucide-react";

export type DashboardActivityItem = {
  id: string;
  type: string;
  title: string;
  time: string;
  status: string;
};

async function fetchRecentActivityLive(): Promise<DashboardActivityItem[]> {
  if (!isSupabaseConfigured() || !isRealDataMode()) return [];

  const supabase = createClient();
  const [inquiries, downloads, whatsapp, contacts] = await Promise.all([
    supabase
      .from("package_inquiries")
      .select("id, customer_name, destination, created_at, status")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("itinerary_downloads")
      .select("id, customer_name, package_name, downloaded_at, synced_to_crm")
      .order("downloaded_at", { ascending: false })
      .limit(8),
    supabase
      .from("whatsapp_leads")
      .select("id, customer_name, phone, selected_package, created_at, synced_to_crm")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("contact_queries")
      .select("id, name, subject, created_at, status")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const items: DashboardActivityItem[] = [
    ...(inquiries.data ?? []).map((i) => ({
      id: i.id,
      type: "Inquiry",
      title: `${i.customer_name} — ${i.destination}`,
      time: i.created_at,
      status: i.status,
    })),
    ...(downloads.data ?? []).map((d) => ({
      id: d.id,
      type: "Download",
      title: `${d.customer_name} downloaded ${d.package_name}`,
      time: d.downloaded_at,
      status: d.synced_to_crm ? "synced" : "pending",
    })),
    ...(whatsapp.data ?? []).map((w) => ({
      id: w.id,
      type: "WhatsApp",
      title: w.customer_name ? `${w.customer_name} — ${w.selected_package}` : `Lead ${w.phone}`,
      time: w.created_at,
      status: w.synced_to_crm ? "synced" : "pending",
    })),
    ...(contacts.data ?? []).map((c) => ({
      id: c.id,
      type: "Contact",
      title: `${c.name} — ${c.subject ?? "General"}`,
      time: c.created_at,
      status: c.status,
    })),
  ];

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
}

export function RecentActivityPanel() {
  const { dataMode } = useSystem();
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchRecentActivityLive().then((items) => {
      if (!cancelled) {
        setActivity(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  return (
    <Card className="border-stone-200/80 shadow-sm lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-5 w-5 text-amber-600" />
          Recent Activity
        </CardTitle>
        <CardDescription>Live — inquiries, downloads & WhatsApp</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="py-6 text-center text-sm text-stone-500">Loading activity…</p>
        ) : activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            No website activity yet. New inquiries and leads will appear here.
          </p>
        ) : (
          activity.map((item) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
