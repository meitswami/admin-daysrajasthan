"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import type { CustomerProfile } from "@/lib/data/customer-links";
import { formatDateTime } from "@/lib/utils";
import { Link2, Mail, Phone } from "lucide-react";

export function CustomerLinkPanel({ profile }: { profile: CustomerProfile }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <p className="text-lg font-semibold text-stone-900">{profile.name ?? "Unknown"}</p>
        <div className="mt-2 space-y-1 text-sm text-stone-600">
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-amber-600" />{profile.email}</p>
          {profile.phone && (
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-600" />{profile.phone}</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="info">{profile.touchpointCount} touchpoints</Badge>
          <StatusBadge status={profile.crmSynced ? "synced" : "pending"} />
        </div>
      </div>

      {profile.inquiries.length > 0 && (
        <Section title="Inquiries" icon={<Link2 className="h-4 w-4" />}>
          {profile.inquiries.map((i) => (
            <Item key={i.id} title={i.destination ?? "Package inquiry"} meta={formatDateTime(i.created_at)}>
              <StatusBadge status={i.status} />
            </Item>
          ))}
        </Section>
      )}

      {profile.downloads.length > 0 && (
        <Section title="PDF Downloads">
          {profile.downloads.map((d) => (
            <Item key={d.id} title={d.package_name} meta={formatDateTime(d.downloaded_at)}>
              <StatusBadge status={d.synced_to_crm ? "synced" : "pending"} />
            </Item>
          ))}
        </Section>
      )}

      {profile.whatsapp.length > 0 && (
        <Section title="WhatsApp">
          {profile.whatsapp.map((w) => (
            <Item key={w.id} title={w.selected_package ?? "WhatsApp lead"} meta={formatDateTime(w.created_at)}>
              <StatusBadge status={w.synced_to_crm ? "synced" : "pending"} />
            </Item>
          ))}
        </Section>
      )}

      {profile.contacts.length > 0 && (
        <Section title="Contact messages">
          {profile.contacts.map((c) => (
            <Item key={c.id} title={c.subject ?? "Contact"} meta={formatDateTime(c.created_at)}>
              <StatusBadge status={c.status} />
            </Item>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {icon}{title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-800">{title}</p>
        <p className="text-xs text-stone-500">{meta}</p>
      </div>
      {children}
    </div>
  );
}
