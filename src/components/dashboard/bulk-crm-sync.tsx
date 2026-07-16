"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { itineraryDownloads, whatsappLeads } from "@/lib/data";
import { Loader2, RefreshCw } from "lucide-react";

export function BulkCrmSync() {
  const { show } = useToast();
  const [syncing, setSyncing] = useState(false);
  const pending =
    itineraryDownloads.filter((d) => !d.synced_to_crm).length +
    whatsappLeads.filter((w) => !w.synced_to_crm).length;

  async function handleSyncAll() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(false);
    show(`Synced ${pending} pending leads to CRM (demo)`);
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
