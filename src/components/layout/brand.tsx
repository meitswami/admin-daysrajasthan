"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { useSystem } from "@/components/providers/system-provider";
import { getBrandInitials } from "@/lib/data/default-site-settings";
import { ROLE_LABELS } from "@/types/rbac";

export function Brand() {
  const { settings } = useSiteSettings();
  const { currentMember } = useSystem();
  const { site_name, site_short_name } = settings.webGeneral;
  const logo = settings.adminGeneral.admin_logo_url || settings.webGeneral.site_logo_url;
  const initials = getBrandInitials(site_short_name);
  const roleLabel = ROLE_LABELS[currentMember.role] ?? "Panel";

  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      {logo ? (
        <div className="relative flex h-10 max-w-[120px] items-center">
          <Image src={logo} alt={site_name} width={120} height={40} unoptimized className="h-10 w-auto max-w-[120px] object-contain" />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-white shadow-lg shadow-amber-500/20">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-white">{site_short_name}</p>
        <p className="truncate text-xs text-stone-400">{roleLabel}</p>
      </div>
    </Link>
  );
}
