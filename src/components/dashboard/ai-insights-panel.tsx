"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const insights = [
  { text: "Priya Sharma has 3 touchpoints — high-intent lead for Golden Triangle", priority: "high" },
  { text: "2 open contact queries need response within 24h", priority: "medium" },
  { text: "Jaisalmer desert blog draft ready to publish before monsoon season", priority: "low" },
  { text: "Anita Desai WhatsApp lead pending CRM sync", priority: "medium" },
];

export function AiInsightsPanel() {
  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-violet-600" />
          AI Insights
          <Badge variant="info" className="ml-auto text-[10px]">Ready</Badge>
        </CardTitle>
        <CardDescription>Suggested actions from linked lead data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((item, i) => (
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
        ))}
      </CardContent>
    </Card>
  );
}
