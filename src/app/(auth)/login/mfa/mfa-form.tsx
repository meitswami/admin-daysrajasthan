"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { completeMfaVerification, verifyDemoMfaCode } from "@/lib/auth/demo-session";
import { getCurrentTeamMember } from "@/lib/rbac/current-user";
import { Smartphone } from "lucide-react";

export default function MfaLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const member = getCurrentTeamMember();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyDemoMfaCode(code)) {
      setError("Enter a valid 6-digit code from Microsoft Authenticator");
      return;
    }
    completeMfaVerification();
    void import("@/lib/system/activity-log").then(({ logActivity }) =>
      logActivity({
        action: "login",
        module: "auth",
        summary: `${member.name} passed MFA challenge`,
        metadata: { mfa: true },
      })
    );
    router.replace(next);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f4] p-4">
      <Card className="w-full max-w-md border-stone-200/80 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="h-5 w-5 text-amber-700" />
            Two-factor authentication
          </CardTitle>
          <CardDescription>
            MFA is enabled for {member.name}. Enter the 6-digit code from Microsoft Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Label htmlFor="mfa_code">Authentication code</Label>
              <Input
                id="mfa_code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                className="mt-1.5 text-center text-lg tracking-[0.3em]"
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={code.length !== 6}>
              Verify & continue
            </Button>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
              Demo mode — any 6-digit code is accepted. Production will verify TOTP via authenticator app.
            </p>
            <p className="text-center text-sm">
              <Link href="/login" className="text-amber-700 hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
