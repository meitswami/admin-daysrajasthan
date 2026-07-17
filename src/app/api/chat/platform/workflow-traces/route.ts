import { fetchWorkflowTraces } from "@/modules/chat/workflow-persist";
import { listRememberedWorkflowTraces } from "@/modules/chat/workflow-trace";
import { ensureServerChatPlatformState } from "@/modules/chat/server-store";

/** Testing-mode workflow traces for Conversations live view. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || undefined;
  const conversationId = url.searchParams.get("conversationId") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || 30) || 30, 80);

  const state = ensureServerChatPlatformState();
  const testingOn = state.settings.testingWorkflowTrace === true;

  const memory = listRememberedWorkflowTraces({ sessionId, conversationId, limit });
  const db = testingOn
    ? await fetchWorkflowTraces({ sessionId, conversationId, limit })
    : [];

  // Prefer newest unique by id (memory first for live turns)
  const byId = new Map<string, (typeof memory)[number]>();
  for (const t of [...memory, ...db]) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  const traces = [...byId.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return Response.json({
    success: true,
    data: {
      testingWorkflowTrace: testingOn,
      traces,
      count: traces.length,
    },
  });
}
