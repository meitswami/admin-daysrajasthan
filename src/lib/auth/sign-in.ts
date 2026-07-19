import { isSupabaseConfigured } from "@/lib/system/data-mode";
import {
  establishSession,
  loginDemoMember,
  logoutDemo,
  persistDemoSessionCookie,
} from "@/lib/auth/demo-session";
import type { TeamMember } from "@/types/rbac";
import { DEMO_TEAM, resolveTeamEmail, setExternalTeamMember } from "@/lib/rbac/current-user";
import { resolveAuthTeamMember } from "@/lib/rbac/resolve-auth-member";

export type AuthLoginResult =
  | { ok: true; member: TeamMember; mode: "supabase" | "demo" }
  | { ok: false; error: string };

function findDemoMember(email: string): TeamMember | null {
  const resolved = resolveTeamEmail(email.trim().toLowerCase());
  return DEMO_TEAM.find((m) => m.email.toLowerCase() === resolved && m.is_active) ?? null;
}

/**
 * Prefer demo team login for known emails (no Supabase round-trip).
 * Otherwise use Supabase email/password when configured.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<AuthLoginResult> {
  const trimmed = email.trim().toLowerCase();
  const demoMatch = findDemoMember(trimmed);

  if (demoMatch) {
    const member = loginDemoMember(demoMatch.email);
    if (member) {
      await persistDemoSessionCookie();
      return { ok: true, member, mode: "demo" };
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (!error && data.user) {
        const member = await resolveAuthTeamMember(data.user);
        if (!member.is_active) {
          await supabase.auth.signOut();
          return { ok: false, error: "This account is disabled" };
        }
        establishSession(member);
        setExternalTeamMember(member);
        await persistDemoSessionCookie();
        return { ok: true, member, mode: "supabase" };
      }

      return { ok: false, error: error?.message ?? "Invalid email or password" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Sign-in failed" };
    }
  }

  return {
    ok: false,
    error: `No active team account for ${email}. Try ${DEMO_TEAM.map((m) => m.email).join(", ")}`,
  };
}

export async function signOutAll(): Promise<void> {
  logoutDemo();
  if (!isSupabaseConfigured()) return;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
  } catch {
    // ignore
  }
}
