"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { getBrandInitials } from "@/lib/data/default-site-settings";
import { signInWithEmailPassword } from "@/lib/auth/sign-in";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const { settings } = useSiteSettings();
  const { site_name, site_short_name, site_description, site_logo_url, copyright_html } = settings.webGeneral;
  const logo = settings.adminGeneral.admin_logo_url || site_logo_url;
  const initials = getBrandInitials(site_short_name);
  const [email, setEmail] = useState(settings.adminGeneral.email || "admin@traveldays.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signInWithEmailPassword(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const { member, mode } = result;

    void import("@/lib/system/activity-log").then(({ logActivity }) =>
      logActivity({
        action: "login",
        module: "auth",
        summary: `${member.name} signed in (${mode})`,
        entity_type: "team_member",
        entity_id: member.id,
        metadata: { mode },
      })
    );

    if (member.mfa_enabled) {
      router.replace(`/login/mfa?next=${encodeURIComponent(next)}`);
      return;
    }
    router.replace(next);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f7f4] lg:flex-row">
      <div className="relative hidden min-h-[200px] flex-1 flex-col justify-between overflow-hidden bg-stone-950 p-8 text-white md:flex lg:min-h-screen lg:max-w-[480px] xl:max-w-[540px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-600/30 via-transparent to-transparent" />
        <div className="relative">
          {logo ? (
            <Image src={logo} alt={site_name} width={170} height={40} unoptimized className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg font-bold">
              {initials}
            </div>
          )}
        </div>
        <div className="relative space-y-4">
          <h2 className="text-2xl font-bold leading-tight xl:text-3xl">{site_name}</h2>
          <p className="text-stone-400">{site_description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 text-white">{site_short_name} Admin</Badge>
            <Badge className="bg-white/10 text-white">CRM Sync</Badge>
          </div>
        </div>
        <p className="relative text-xs text-stone-500">{copyright_html.replace(/<[^>]+>/g, "")}</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md border-stone-200/80 shadow-xl">
          <CardHeader className="text-center sm:text-left">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg font-bold text-white md:hidden">
              {initials}
            </div>
            <CardTitle className="text-xl sm:text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to {site_short_name} admin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDemoLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Continue to Dashboard"}
              </Button>
              {error && <p className="text-center text-sm text-red-600">{error}</p>}
              <p className="text-center text-sm text-stone-500">
                <Link href="/login/forgot-password" className="text-amber-700 hover:underline">Forgot password?</Link>
              </p>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                Use your company email <span className="font-medium">info@traveldaysrajasthan.com</span> (password
                ignored in demo). MFA demo: admin@traveldays.in. Real passwords apply when Supabase Auth users exist.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
