import type { TeamMember, TeamRole } from "@/types/rbac";
import { isSupabaseConfigured } from "@/lib/system/data-mode";

const SESSION_KEY = "td-current-team-member-v1";
const EXTERNAL_MEMBER_KEY = "td-external-team-member-v1";

const TEAM_ROLES: TeamRole[] = [
  "superadmin",
  "admin",
  "sales",
  "operations",
  "accounts",
  "staff",
];

function asTeamRole(value: string | null | undefined): TeamRole | null {
  if (!value) return null;
  if (value === "super_admin") return "superadmin";
  return TEAM_ROLES.includes(value as TeamRole) ? (value as TeamRole) : null;
}

export const DEMO_TEAM: TeamMember[] = [
  {
    id: "tm-info",
    name: "Travel Days Admin",
    email: "info@traveldaysrajasthan.com",
    role: "superadmin",
    mfa_enabled: false,
    mfa_locked: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tm-vandana",
    name: "Vandana Shekhawat",
    email: "vandana@traveldays.in",
    role: "sales",
    mfa_enabled: false,
    mfa_locked: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tm-admin",
    name: "Admin User",
    email: "admin@traveldays.in",
    role: "superadmin",
    mfa_enabled: true,
    mfa_locked: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tm-priya",
    name: "Priya Vohra",
    email: "priya@traveldays.in",
    role: "admin",
    mfa_enabled: false,
    mfa_locked: false,
    is_active: true,
    created_at: "2026-02-01T00:00:00Z",
  },
];

/** Common aliases → primary demo account email */
const EMAIL_ALIASES: Record<string, string> = {
  "info@traveldays.in": "info@traveldaysrajasthan.com",
  "admin@traveldaysrajasthan.com": "info@traveldaysrajasthan.com",
};

export function resolveTeamEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  return EMAIL_ALIASES[trimmed] ?? trimmed;
}

function loadSessionId(): string {
  if (typeof window === "undefined") return "tm-info";
  return localStorage.getItem(SESSION_KEY) ?? "tm-info";
}

export function getCurrentTeamMember(): TeamMember {
  const id = loadSessionId();
  const demo = DEMO_TEAM.find((m) => m.id === id);
  if (demo) return demo;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(EXTERNAL_MEMBER_KEY);
      if (raw) {
        const external = JSON.parse(raw) as TeamMember;
        if (external.id === id) return external;
      }
    } catch {
      // ignore
    }
  }
  return DEMO_TEAM[0];
}

export function setCurrentTeamMemberId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, id);
  window.dispatchEvent(new CustomEvent("td-team-member-change"));
}

export function setExternalTeamMember(member: TeamMember) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXTERNAL_MEMBER_KEY, JSON.stringify(member));
  setCurrentTeamMemberId(member.id);
}

function readExternalMember(): TeamMember | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EXTERNAL_MEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeamMember;
  } catch {
    return null;
  }
}

/** Demo roster plus the signed-in Real DB member (if any). */
export function listTeamMembers(): TeamMember[] {
  const external = readExternalMember();
  if (!external) return [...DEMO_TEAM];
  const email = external.email.toLowerCase();
  if (DEMO_TEAM.some((m) => m.email.toLowerCase() === email)) return [...DEMO_TEAM];
  return [external, ...DEMO_TEAM];
}

/** Prefer Real DB `td_team_members`, then fall back to demo + signed-in member. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const fallback = listTeamMembers();
  if (!isSupabaseConfigured()) return fallback;

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("td_team_members")
      .select("id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error || !data?.length) return fallback;

    const fromDb: TeamMember[] = [];
    for (const row of data) {
      const role = asTeamRole(row.role);
      if (!role) continue;
      fromDb.push({
        id: row.id,
        name: row.name,
        email: row.email,
        role,
        mfa_enabled: Boolean(row.mfa_enabled),
        mfa_locked: Boolean(row.mfa_locked),
        is_active: row.is_active !== false,
        created_at: row.created_at ?? new Date().toISOString(),
      });
    }

    if (!fromDb.length) return fallback;

    // Keep demo accounts available for role-switch testing alongside Real DB members.
    const dbEmails = new Set(fromDb.map((m) => m.email.toLowerCase()));
    const demoExtras = DEMO_TEAM.filter((m) => !dbEmails.has(m.email.toLowerCase()));
    return [...fromDb, ...demoExtras];
  } catch {
    return fallback;
  }
}

export function findSuperAdminMemberId(members: TeamMember[] = listTeamMembers()): string {
  const external = readExternalMember();
  if (external?.role === "superadmin" && external.is_active) return external.id;
  return members.find((m) => m.role === "superadmin" && m.is_active)?.id ?? DEMO_TEAM[0].id;
}

export function updateTeamMemberMfa(
  memberId: string,
  patch: Partial<Pick<TeamMember, "mfa_enabled" | "mfa_locked">>
) {
  const idx = DEMO_TEAM.findIndex((m) => m.id === memberId);
  if (idx < 0) return null;
  const prev = DEMO_TEAM[idx];
  DEMO_TEAM[idx] = { ...prev, ...patch };

  void import("@/lib/system/activity-log").then(({ logActivity }) => {
    if (patch.mfa_enabled === true && !prev.mfa_enabled) {
      logActivity({
        action: "mfa_enable",
        module: "auth",
        summary: `MFA enabled for ${prev.name}`,
        entity_type: "team_member",
        entity_id: memberId,
      });
    } else if (patch.mfa_enabled === false && prev.mfa_enabled) {
      logActivity({
        action: "mfa_disable",
        module: "auth",
        summary: `MFA disabled for ${prev.name}`,
        entity_type: "team_member",
        entity_id: memberId,
      });
    }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("td-team-member-change"));
  }

  return DEMO_TEAM[idx];
}
