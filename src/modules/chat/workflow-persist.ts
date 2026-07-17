/**
 * Persist / load testing workflow traces from Supabase (opt-in only).
 */

import { createClient } from "@/lib/supabase/server";
import type { ChatWorkflowTrace, PackageHitSummary, WorkflowStep } from "./workflow-trace";
import { rememberWorkflowTrace } from "./workflow-trace";

type TraceRow = {
  id: string;
  session_id: string;
  conversation_id: string | null;
  website_id: string | null;
  message_id: string | null;
  user_message: string;
  reply_preview: string | null;
  provider: string | null;
  model_id: string | null;
  intent: string | null;
  used_fallback: boolean;
  ai_mode: string | null;
  package_hit_count: number;
  total_hit_count: number;
  package_ids: string[] | null;
  package_summaries: PackageHitSummary[] | null;
  steps: WorkflowStep[] | null;
  duration_ms: number;
  trace_id: string | null;
  created_at: string;
};

function rowToTrace(row: TraceRow): ChatWorkflowTrace {
  return {
    id: row.id,
    sessionId: row.session_id,
    conversationId: row.conversation_id,
    websiteId: row.website_id,
    messageId: row.message_id,
    userMessage: row.user_message,
    replyPreview: row.reply_preview,
    provider: row.provider,
    modelId: row.model_id,
    intent: row.intent,
    usedFallback: row.used_fallback,
    aiMode: row.ai_mode,
    packageHitCount: row.package_hit_count,
    totalHitCount: row.total_hit_count,
    packageIds: row.package_ids ?? [],
    packageSummaries: row.package_summaries ?? [],
    steps: row.steps ?? [],
    durationMs: row.duration_ms,
    traceId: row.trace_id,
    createdAt: row.created_at,
  };
}

export async function persistWorkflowTrace(trace: ChatWorkflowTrace): Promise<void> {
  rememberWorkflowTrace(trace);
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("chat_workflow_traces").insert({
      id: trace.id,
      session_id: trace.sessionId,
      conversation_id: trace.conversationId,
      website_id: trace.websiteId,
      message_id: trace.messageId,
      user_message: trace.userMessage.slice(0, 4000),
      reply_preview: trace.replyPreview?.slice(0, 500) ?? null,
      provider: trace.provider,
      model_id: trace.modelId,
      intent: trace.intent,
      used_fallback: trace.usedFallback,
      ai_mode: trace.aiMode,
      package_hit_count: trace.packageHitCount,
      total_hit_count: trace.totalHitCount,
      package_ids: trace.packageIds,
      package_summaries: trace.packageSummaries,
      steps: trace.steps,
      duration_ms: trace.durationMs,
      trace_id: trace.traceId,
      created_at: trace.createdAt,
    });
    if (error) {
      console.warn("[chat.workflow_trace] persist failed:", error.message);
    }
  } catch (err) {
    console.warn("[chat.workflow_trace] persist error:", err);
  }
}

export async function fetchWorkflowTraces(filters?: {
  sessionId?: string;
  conversationId?: string;
  limit?: number;
}): Promise<ChatWorkflowTrace[]> {
  const limit = filters?.limit ?? 40;
  try {
    const supabase = await createClient();
    let q = supabase
      .from("chat_workflow_traces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (filters?.sessionId) q = q.eq("session_id", filters.sessionId);
    if (filters?.conversationId) q = q.eq("conversation_id", filters.conversationId);
    const { data, error } = await q;
    if (error) {
      console.warn("[chat.workflow_trace] fetch failed:", error.message);
      return [];
    }
    return ((data as TraceRow[]) ?? []).map(rowToTrace);
  } catch (err) {
    console.warn("[chat.workflow_trace] fetch error:", err);
    return [];
  }
}
