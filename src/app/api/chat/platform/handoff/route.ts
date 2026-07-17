import { z } from "zod";
import {
  assignConversationToAgent,
  postAgentReply,
} from "@/modules/chat/conversation/orchestrate";
import { ensureServerChatPlatformState } from "@/modules/chat/server-store";

const assignSchema = z.object({
  action: z.literal("assign"),
  conversationId: z.string().min(1),
  teamMemberId: z.string().min(1),
  assignedBy: z.string().min(1).max(120),
  takeOver: z.boolean().optional(),
});

const replySchema = z.object({
  action: z.literal("agent_reply"),
  sessionId: z.string().min(1),
  text: z.string().min(1).max(4000),
  agentName: z.string().min(1).max(120),
});

const bodySchema = z.discriminatedUnion("action", [assignSchema, replySchema]);

/**
 * POST /api/chat/platform/handoff
 * Superadmin assigns chat leads to team members, or posts a human agent reply.
 */
export async function POST(request: Request) {
  try {
    ensureServerChatPlatformState();
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { success: false, message: "Invalid handoff payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;
    if (input.action === "assign") {
      const conversation = assignConversationToAgent({
        conversationId: input.conversationId,
        teamMemberId: input.teamMemberId,
        assignedBy: input.assignedBy,
        takeOver: input.takeOver,
      });
      return Response.json({
        success: true,
        message: `Assigned to ${conversation.assignedToName}`,
        data: { conversation },
      });
    }
    const message = postAgentReply({
      sessionId: input.sessionId,
      text: input.text,
      agentName: input.agentName,
    });
    return Response.json({
      success: true,
      message: "Agent reply posted",
      data: { message },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Handoff failed";
    return Response.json({ success: false, message }, { status: 400 });
  }
}
