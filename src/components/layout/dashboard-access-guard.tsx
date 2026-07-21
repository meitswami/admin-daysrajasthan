"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessModule } from "@/lib/rbac/permissions";
import { ensureClientSession } from "@/lib/auth/ensure-client-session";
import { needsMfaChallenge } from "@/lib/auth/demo-session";
import { getCurrentTeamMember } from "@/lib/rbac/current-user";
import { ShieldOff } from "lucide-react";

export function DashboardAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [roleLabel, setRoleLabel] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const hasSession = await ensureClientSession();
      if (cancelled) return;

      if (!hasSession) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (needsMfaChallenge()) {
        router.replace(`/login/mfa?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const member = getCurrentTeamMember();
      setRoleLabel(`${member.name} (${member.role})`);
      setAllowed(canAccessModule(pathname));
      setReady(true);
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Checking access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldOff className="h-10 w-10 text-red-500" />
        <h1 className="text-lg font-semibold text-stone-900">Access denied</h1>
        <p className="max-w-md text-sm text-stone-600">
          Current role{roleLabel ? `: ${roleLabel}` : ""} does not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
