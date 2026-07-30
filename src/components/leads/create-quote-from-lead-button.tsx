"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createQuoteFromLead } from "@/lib/leads/create-quote-from-lead";
import type { UnifiedLead } from "@/lib/leads/unified-leads";
import { getLeadConversion } from "@/lib/leads/unified-leads";
import { useToast } from "@/components/ui/toast";
import { Route, ExternalLink } from "lucide-react";
import Link from "next/link";

export function CreateQuoteFromLeadButton({ lead }: { lead: UnifiedLead }) {
  const router = useRouter();
  const { show } = useToast();
  const converted = lead.converted_quote_id ?? getLeadConversion(lead.id);

  if (converted) {
    return (
      <Link
        href={`/itinerary-builder?search=${converted}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        {converted}
      </Link>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void createQuoteFromLead(lead).then((record) => {
          show(`Created ${record.quote_id} from lead`);
          router.push(`/itinerary-builder/${record.id}`);
        });
      }}
    >
      <Route className="h-3.5 w-3.5" />
      Create quote
    </Button>
  );
}
