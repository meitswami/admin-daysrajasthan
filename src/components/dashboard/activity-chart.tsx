"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="border-stone-200/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Module activity</CardTitle>
        <CardDescription>Total records per module</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-stone-600">{item.label}</span>
              <span className="font-semibold tabular-nums text-stone-900">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
