"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const { show } = useToast();
  const [email, setEmail] = useState("admin@traveldays.in");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSent(true);
    show(
      result.mode === "supabase"
        ? "Reset link sent — check your inbox"
        : "Demo mode — reset link simulated (configure auth for real email)"
    );

    void import("@/lib/system/activity-log").then(({ logActivity }) =>
      logActivity({
        action: "settings_change",
        module: "auth",
        summary: `Password reset requested for ${email}`,
        metadata: { mode: result.mode },
      })
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f4] p-4">
      <Card className="w-full max-w-md border-stone-200/80 shadow-xl">
        <CardHeader>
          <Link href="/login" className="mb-2 inline-flex items-center gap-1 text-sm text-amber-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter your admin email — we&apos;ll send a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Mail className="h-6 w-6" />
              </div>
              <p className="text-sm text-stone-700">
                If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
              </p>
              <p className="text-xs text-stone-500">
                After opening the link, you&apos;ll set a new password on this site.
              </p>
              <Link
                href="/login"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
