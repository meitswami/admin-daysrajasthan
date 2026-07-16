import { establishSession, isDemoLoggedIn } from "@/lib/auth/demo-session";
import { DEMO_TEAM, setExternalTeamMember } from "@/lib/rbac/current-user";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import type { TeamMember } from "@/types/rbac";

function memberFromSupabaseUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string };
}): TeamMember {
  const email = user.email?.toLowerCase() ?? "";
  const demoMatch = DEMO_TEAM.find((m) => m.email.toLowerCase() === email);
  if (demoMatch) return demoMatch;

  const member: TeamMember = {
    id: user.id,
    name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
    email: user.email ?? email,
    role: "admin",
    mfa_enabled: false,
    mfa_locked: false,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  setExternalTeamMember(member);
  return member;
}

/** Restore local demo session from Supabase when middleware already authenticated the user. */
export async function ensureClientSession(): Promise<boolean> {
  if (isDemoLoggedIn()) return true;
  if (!isSupabaseConfigured()) return false;

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return false;
    establishSession(memberFromSupabaseUser(data.user));
    return true;
  } catch {
    return false;
  }
}
