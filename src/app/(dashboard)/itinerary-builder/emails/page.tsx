"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { MailboxView } from "@/components/email/mailbox-view";
import { BookingEmailLog } from "@/components/email/booking-email-log";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "booking", label: "Email Management" },
  { id: "mailbox", label: "Team Mailbox" },
  { id: "inquiry", label: "Inquiry Management" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function EmailHubPage() {
  const [tab, setTab] = useState<TabId>("booking");

  return (
    <>
      <Header
        title="Email & CRM"
        description="Booking email log, team mailbox (Inbox/Draft/Sent/Scheduled/Outbox/Spam), inquiry sync"
      />
      <div className="space-y-6 px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap gap-1 border-b border-stone-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition",
                tab === t.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "booking" && <BookingEmailLog />}
        {tab === "mailbox" && <MailboxView />}
        {tab === "inquiry" && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            <p className="font-medium text-stone-900">Inquiry Management</p>
            <p className="mt-2">
              Website inquiries, WhatsApp leads, and contact forms are unified under{" "}
              <strong>Leads</strong>. Use <strong>Create quote</strong> on each lead to pre-fill the
              Itinerary Builder wizard.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-1">
              <li>
                <a href="/inquiries" className="text-blue-700 hover:underline">
                  Package Inquiries
                </a>
              </li>
              <li>
                <a href="/whatsapp-leads" className="text-blue-700 hover:underline">
                  WhatsApp Leads
                </a>
              </li>
              <li>
                <a href="/contacts" className="text-blue-700 hover:underline">
                  Contact Queries
                </a>
              </li>
              <li>
                <a href="/leads" className="text-blue-700 hover:underline">
                  Unified Leads Hub
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
