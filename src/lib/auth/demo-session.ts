import type { TeamMember } from "@/types/rbac";
import { DEMO_TEAM, resolveTeamEmail, setCurrentTeamMemberId } from "@/lib/rbac/current-user";

const SESSION_KEY = "td-demo-auth-v1";

export type DemoAuthSession = {
  memberId: string;
  loggedInAt: string;
  mfaVerified: boolean;
};

function readSession(): DemoAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoAuthSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: DemoAuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function syncDemoSessionCookie(active: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/demo-session", { method: active ? "POST" : "DELETE" });
  } catch {
    // ignore — client guard still applies
  }
}

export async function persistDemoSessionCookie(): Promise<void> {
  await syncDemoSessionCookie(true);
}

export async function clearDemoSessionCookie(): Promise<void> {
  await syncDemoSessionCookie(false);
}

export function loginDemoMember(email: string): TeamMember | null {
  const resolved = resolveTeamEmail(email);
  const member = DEMO_TEAM.find((m) => m.email.toLowerCase() === resolved && m.is_active);
  if (!member) return null;

  setCurrentTeamMemberId(member.id);
  writeSession({
    memberId: member.id,
    loggedInAt: new Date().toISOString(),
    mfaVerified: !member.mfa_enabled,
  });
  return member;
}

/** Establish session for any TeamMember (Supabase Auth users outside DEMO_TEAM) */
export function establishSession(member: TeamMember): TeamMember {
  setCurrentTeamMemberId(member.id);
  writeSession({
    memberId: member.id,
    loggedInAt: new Date().toISOString(),
    mfaVerified: !member.mfa_enabled,
  });
  return member;
}

export function completeMfaVerification(): void {
  const session = readSession();
  if (!session) return;
  writeSession({ ...session, mfaVerified: true });
}

export function isDemoLoggedIn(): boolean {
  return Boolean(readSession());
}

export function needsMfaChallenge(): boolean {
  const session = readSession();
  if (!session) return false;
  const member = DEMO_TEAM.find((m) => m.id === session.memberId);
  // Unknown Auth users: trust mfaVerified flag only
  if (!member) return !session.mfaVerified;
  if (!member.mfa_enabled) return false;
  return !session.mfaVerified;
}

export function logoutDemo(): void {
  writeSession(null);
  void clearDemoSessionCookie();
}

export function getDemoSession(): DemoAuthSession | null {
  return readSession();
}

/** Demo MFA code — replace with TOTP verification in production */
export function verifyDemoMfaCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
