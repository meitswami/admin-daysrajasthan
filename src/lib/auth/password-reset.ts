import { isSupabaseConfigured } from "@/lib/system/data-mode";

export type PasswordResetResult =
  | { ok: true; mode: "supabase" | "demo" }
  | { ok: false; error: string };

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required" };

  if (!isSupabaseConfigured()) {
    // Demo: pretend success so UI flow can be tested offline
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, mode: "demo" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${origin}/login/update-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "supabase" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send reset email" };
  }
}

export async function updatePassword(newPassword: string): Promise<PasswordResetResult> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  if (!isSupabaseConfigured()) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, mode: "demo" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "supabase" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update password" };
  }
}
