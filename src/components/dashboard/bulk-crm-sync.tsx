"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { useSystem } from "@/components/providers/system-provider";
import { Loader2, RefreshCw } from "lucide-react";

async function countPendingCrm(): Promise<number> {
  if (!isSupabaseConfigured() || !isRealDataMode()) return 0;
  const supabase = createClient();
  const [downloads, whatsapp] = await Promise.all([
    supabase
      .from("itinerary_downloads")
      .select("id", { count: "exact", head: true })
      .eq("synced_to_crm", false),
    supabase
      .from("whatsapp_leads")
      .select("id", { count: "exact", head: true })
      .eq("synced_to_crm", false),
  ]);
  return (downloads.count ?? 0) + (whatsapp.count ?? 0);
}

export function BulkCrmSync() {
  const { show } = useToast();
  const { dataMode } = useSystem();
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void countPendingCrm().then((n) => {
      if (!cancelled) setPending(n);
    });
    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  async function handleSyncAll() {
    if (!isSupabaseConfigured() || !isRealDataMode()) {
      show("CRM sync requires Real mode + Supabase");
      return;
    }
    setSyncing(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      await Promise.all([
        supabase
          .from("itinerary_downloads")
          .update({ synced_to_crm: true })
          .eq("synced_to_crm", false),
        supabase
          .from("whatsapp_leads")
          .update({ synced_to_crm: true, crm_synced_at: now })
          .eq("synced_to_crm", false),
      ]);
      const left = await countPendingCrm();
      setPending(left);
      show(left === 0 ? "All pending leads synced to CRM" : `${left} still pending`);
    } catch (e) {
      console.warn(e);
      show("CRM sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="border-emerald-200/60 bg-emerald-50/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bulk CRM sync</CardTitle>
        <CardDescription>{pending} pending downloads & WhatsApp leads</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSyncAll} disabled={syncing || pending === 0} className="w-full sm:w-auto">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync all pending
        </Button>
      </CardContent>
    </Card>
  );
}
