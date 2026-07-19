import { establishSession, isDemoLoggedIn } from "@/lib/auth/demo-session";
import { setExternalTeamMember } from "@/lib/rbac/current-user";
import { resolveAuthTeamMember } from "@/lib/rbac/resolve-auth-member";
import { isSupabaseConfigured } from "@/lib/system/data-mode";

/** Restore local session from Supabase when middleware already authenticated the user. */
export async function ensureClientSession(): Promise<boolean> {
  if (isDemoLoggedIn()) return true;
  if (!isSupabaseConfigured()) return false;

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return false;
    const member = await resolveAuthTeamMember(data.user);
    if (!member.is_active) return false;
    establishSession(member);
    setExternalTeamMember(member);
    return true;
  } catch {
    return false;
  }
}
