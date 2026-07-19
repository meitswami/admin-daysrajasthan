import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RBAC_OVERRIDES_SETTINGS_KEY } from "@/lib/rbac/permission-overrides";
import type { RbacPermissionOverrides } from "@/types/rbac";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("td_system_settings")
      .select("value")
      .eq("key", RBAC_OVERRIDES_SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return NextResponse.json({ overrides: {}, source: "fallback" });
    }

    let overrides: RbacPermissionOverrides = {};
    const raw = data.value;
    if (typeof raw === "string") {
      try {
        overrides = JSON.parse(raw) as RbacPermissionOverrides;
      } catch {
        overrides = {};
      }
    } else if (typeof raw === "object" && raw !== null) {
      overrides = raw as RbacPermissionOverrides;
    }

    return NextResponse.json({ overrides, source: "supabase" });
  } catch {
    return NextResponse.json({ overrides: {}, source: "local" });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { overrides?: RbacPermissionOverrides };
    if (!body.overrides || typeof body.overrides !== "object") {
      return NextResponse.json({ error: "Invalid overrides" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("td_system_settings").upsert({
      key: RBAC_OVERRIDES_SETTINGS_KEY,
      value: body.overrides,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message, persisted: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
