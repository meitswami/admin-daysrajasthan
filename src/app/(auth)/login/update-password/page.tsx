"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { updatePassword } from "@/lib/auth/password-reset";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { show } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(!isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void import("@/lib/supabase/client").then(async ({ createClient }) => {
      const supabase = createClient();
      // Exchange recovery hash/code if present
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        // SSR client picks up session from URL fragment via detectSessionInUrl
        await supabase.auth.getSession();
      }
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session) || !isSupabaseConfigured());
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    show(result.mode === "supabase" ? "Password updated — sign in with your new password" : "Demo password update recorded");
    void import("@/lib/system/activity-log").then(({ logActivity }) =>
      logActivity({
        action: "settings_change",
        module: "auth",
        summary: "Password updated",
        metadata: { mode: result.mode },
      })
    );
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f4] p-4">
      <Card className="w-full max-w-md border-stone-200/80 shadow-xl">
        <CardHeader>
          <Link href="/login" className="mb-2 inline-flex items-center gap-1 text-sm text-amber-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-700" />
            Set new password
          </CardTitle>
          <CardDescription>
            Choose a new password for your admin account (min. 8 characters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!ready && (
              <p className="text-xs text-amber-800">
                Open this page from the email reset link so Supabase can restore your recovery session.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
