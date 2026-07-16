/**
 * Public lead persistence adapter used by thin gateway handlers.
 * Returns plain data (not NextResponse) so the API Gateway owns the HTTP envelope.
 */
import { createClient } from "@/lib/supabase/server";

export type PersistPublicResult<T> = {
  mode: "demo" | "live";
  id: string | null;
  data: T;
};

export async function persistPublicRecord<T extends Record<string, unknown>>(
  table: string,
  payload: T
): Promise<PersistPublicResult<T>> {
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http"));

  if (!supabaseConfigured) {
    return {
      mode: "demo",
      id: null,
      data: payload,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error) {
    throw new Error(error.message);
  }

  return {
    mode: "live",
    id: data.id as string,
    data: payload,
  };
}

/** @deprecated Prefer persistPublicRecord + api-gateway runGateway */
export async function insertOrMock<T extends Record<string, unknown>>(table: string, payload: T) {
  const { NextResponse } = await import("next/server");
  try {
    const result = await persistPublicRecord(table, payload);
    return NextResponse.json(
      {
        ok: true,
        mode: result.mode,
        message:
          result.mode === "demo"
            ? "Accepted — will persist when Supabase connects"
            : "Created",
        data: result.data,
        id: result.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
