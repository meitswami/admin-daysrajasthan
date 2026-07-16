import { NextResponse } from "next/server";
import type { ActivityAction } from "@/types/system";
import {
  fetchActivityLogsFromSupabase,
  insertActivityLogToSupabase,
} from "@/lib/supabase/activity-log-queries";

type PostBody = {
  action: ActivityAction;
  module: string;
  summary: string;
  entity_type?: string | null;
  entity_id?: string | null;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    if (!body.action || !body.module || !body.summary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = {
      action: body.action,
      module: body.module,
      entity_type: body.entity_type ?? null,
      entity_id: body.entity_id ?? null,
      summary: body.summary,
      actor_id: body.actor_id ?? "system",
      actor_name: body.actor_name ?? "System",
      actor_role: body.actor_role ?? "staff",
      ip_address: null,
      metadata: body.metadata ?? null,
      created_at: body.created_at ?? new Date().toISOString(),
    };

    await insertActivityLogToSupabase(entry);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to log activity";
    return NextResponse.json({ error: message, persisted: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "200");
    const module = searchParams.get("module") ?? undefined;
    const action = (searchParams.get("action") as ActivityAction | null) ?? undefined;

    const logs = await fetchActivityLogsFromSupabase({
      limit,
      module,
      action,
    });
    return NextResponse.json({ logs, source: "supabase" });
  } catch {
    return NextResponse.json({ logs: [], source: "unavailable" });
  }
}
