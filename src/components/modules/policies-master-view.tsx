"use client";

import { Header } from "@/components/layout/header";
import { PageMain } from "@/components/ui/data-table";
import {
  MASTER_CANCELLATION,
  MASTER_PAYMENT,
  MASTER_TERMS,
} from "@/lib/itinerary-builder/policy-master";

export function PoliciesMasterView() {
  const sections = [
    { title: "Terms & Conditions", items: MASTER_TERMS, tone: "bg-slate-50" },
    { title: "Cancellation & Refund Policy", items: MASTER_CANCELLATION, tone: "bg-orange-50" },
    { title: "Payment Policy", items: MASTER_PAYMENT, tone: "bg-violet-50" },
  ];

  return (
    <>
      <Header
        title="Policies"
        description="Fixed Terms, Cancellation & Payment policies used on Preview & Confirm"
      />
      <PageMain>
        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className={`rounded-2xl border border-stone-200 p-5 ${section.tone}`}
            >
              <h2 className="mb-3 text-lg font-semibold text-stone-900">{section.title}</h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
                {section.items.map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </PageMain>
    </>
  );
}
