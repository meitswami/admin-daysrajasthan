"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { useSystem } from "@/components/providers/system-provider";
import { Sparkles } from "lucide-react";

type Insight = { text: string; priority: "high" | "medium" | "low" };

async function buildInsightsFromSupabase(): Promise<Insight[]> {
  if (!isSupabaseConfigured() || !isRealDataMode()) return [];

  const supabase = createClient();
  const [openContacts, newInquiries, unsyncedWa] = await Promise.all([
    supabase
      .from("contact_queries")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("package_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("whatsapp_leads")
      .select("id", { count: "exact", head: true })
      .eq("synced_to_crm", false),
  ]);

  const insights: Insight[] = [];
  const openCount = openContacts.count ?? 0;
  const newCount = newInquiries.count ?? 0;
  const waCount = unsyncedWa.count ?? 0;

  if (newCount > 0) {
    insights.push({
      text: `${newCount} new package inquir${newCount === 1 ? "y" : "ies"} awaiting response`,
      priority: "high",
    });
  }
  if (openCount > 0) {
    insights.push({
      text: `${openCount} open contact quer${openCount === 1 ? "y" : "ies"} need follow-up`,
      priority: "medium",
    });
  }
  if (waCount > 0) {
    insights.push({
      text: `${waCount} WhatsApp lead${waCount === 1 ? "" : "s"} pending CRM sync`,
      priority: "medium",
    });
  }

  return insights;
}

export function AiInsightsPanel() {
  const { dataMode } = useSystem();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void buildInsightsFromSupabase().then((next) => {
      if (!cancelled) {
        setInsights(next);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-violet-600" />
          AI Insights
          <Badge variant="info" className="ml-auto text-[10px]">
            Live
          </Badge>
        </CardTitle>
        <CardDescription>Suggested actions from Supabase lead data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-stone-500">Checking leads…</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-stone-500">No action items — inbox is clear.</p>
        ) : (
          insights.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-violet-100/80 bg-white/80 px-3 py-2.5 text-sm text-stone-700"
            >
              <span
                className={
                  item.priority === "high"
                    ? "text-xs font-semibold text-red-600"
                    : item.priority === "medium"
                      ? "text-xs font-semibold text-amber-700"
                      : "text-xs font-semibold text-stone-500"
                }
              >
                {item.priority} priority
              </span>
              <p className="mt-0.5">{item.text}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
