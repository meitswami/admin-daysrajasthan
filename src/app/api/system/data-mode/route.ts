import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  // Production always reports Real — Dummy is not allowed when the API can reach Supabase.
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("td_system_settings")
      .select("value")
      .eq("key", "data_mode")
      .maybeSingle();

    if (!error) {
      // Keep server setting locked to real for production consistency.
      if (data?.value !== "real" && data?.value !== '"real"') {
        await supabase.from("td_system_settings").upsert({
          key: "data_mode",
          value: "real",
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ mode: "real", source: "supabase" });
  } catch {
    return NextResponse.json({ mode: "real", source: "forced" });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { mode?: "dummy" | "real" };
    // Reject Dummy — production is Real only.
    const mode = "real";
    if (body.mode === "dummy") {
      return NextResponse.json(
        {
          ok: true,
          mode,
          persisted: true,
          message: "Dummy mode is disabled in production. Staying on Real.",
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("td_system_settings").upsert({
      key: "data_mode",
      value: mode,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message, persisted: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode, persisted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
