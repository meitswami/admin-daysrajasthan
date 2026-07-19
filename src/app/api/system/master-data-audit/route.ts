import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PostBody = {
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete";
  summary: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    if (!body.entity_type || !body.entity_id || !body.action || !body.summary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("td_master_data_audit").insert({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action: body.action,
      summary: body.summary,
      actor_id: body.actor_id ?? null,
      actor_name: body.actor_name ?? null,
      actor_role: body.actor_role ?? null,
      before_data: body.before_data ?? null,
      after_data: body.after_data ?? null,
      created_at: body.created_at ?? new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message, persisted: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    const supabase = await createClient();
    let q = supabase
      .from("td_master_data_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entityType) q = q.eq("entity_type", entityType);
    if (entityId) q = q.eq("entity_id", entityId);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ logs: [], error: error.message }, { status: 500 });
    }
    return NextResponse.json({ logs: data ?? [] });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}
