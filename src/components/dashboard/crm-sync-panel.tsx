"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/client";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { useSystem } from "@/components/providers/system-provider";
import { Link2 } from "lucide-react";

type LinkedRow = {
  email: string;
  name: string | null;
  touchpointCount: number;
  crmSynced: boolean;
};

async function fetchLinkedCustomersLive(): Promise<LinkedRow[]> {
  if (!isSupabaseConfigured() || !isRealDataMode()) return [];

  const supabase = createClient();
  const [inquiries, downloads, contacts] = await Promise.all([
    supabase.from("package_inquiries").select("email, customer_name"),
    supabase.from("itinerary_downloads").select("email, customer_name, synced_to_crm"),
    supabase.from("contact_queries").select("email, name"),
  ]);

  const byEmail = new Map<
    string,
    { name: string | null; touchpoints: number; syncedFlags: boolean[] }
  >();

  function bump(email: string | null | undefined, name: string | null, synced?: boolean) {
    if (!email) return;
    const key = email.toLowerCase();
    const cur = byEmail.get(key) ?? { name: null, touchpoints: 0, syncedFlags: [] };
    cur.touchpoints += 1;
    if (!cur.name && name) cur.name = name;
    if (typeof synced === "boolean") cur.syncedFlags.push(synced);
    byEmail.set(key, cur);
  }

  for (const row of inquiries.data ?? []) bump(row.email, row.customer_name);
  for (const row of downloads.data ?? []) bump(row.email, row.customer_name, row.synced_to_crm);
  for (const row of contacts.data ?? []) bump(row.email, row.name);

  return [...byEmail.entries()]
    .map(([email, v]) => ({
      email,
      name: v.name,
      touchpointCount: v.touchpoints,
      crmSynced: v.syncedFlags.length > 0 && v.syncedFlags.every(Boolean),
    }))
    .filter((r) => r.touchpointCount > 1)
    .sort((a, b) => b.touchpointCount - a.touchpointCount)
    .slice(0, 4);
}

export function CrmSyncPanel() {
  const { dataMode } = useSystem();
  const [rows, setRows] = useState<LinkedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchLinkedCustomersLive().then((next) => {
      if (!cancelled) setRows(next);
    });
    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  return (
    <Card className="border-stone-200/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Link2 className="h-5 w-5 text-emerald-600" />
          CRM Sync
        </CardTitle>
        <CardDescription>Customers in multiple modules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-stone-500">No multi-touchpoint customers yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.email} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-800">{row.name ?? row.email}</p>
                <p className="text-xs text-stone-500">{row.touchpointCount} touchpoints</p>
              </div>
              <StatusBadge status={row.crmSynced ? "synced" : "pending"} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
