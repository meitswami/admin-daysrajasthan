import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("td_system_settings")
      .select("value")
      .eq("key", "data_mode")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ mode: "dummy", source: "fallback" });
    }

    const raw = data?.value;
    const mode =
      raw === "real" || raw === '"real"' || (typeof raw === "string" && raw.includes("real"))
        ? "real"
        : "dummy";

    return NextResponse.json({ mode, source: "supabase" });
  } catch {
    return NextResponse.json({ mode: "dummy", source: "local" });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { mode?: "dummy" | "real" };
    if (body.mode !== "dummy" && body.mode !== "real") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("td_system_settings").upsert({
      key: "data_mode",
      value: body.mode,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message, persisted: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: body.mode, persisted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
