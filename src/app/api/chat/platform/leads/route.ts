import { z } from "zod";
import { heartbeatPresence, listOnlineTeamMembers } from "@/modules/chat/presence";
import {
  acceptLeadOffer,
  claimFloatingLead,
  listActionableLeadsForMember,
  processLeadRotations,
} from "@/modules/chat/lead-routing";
import { ensureServerChatPlatformState } from "@/modules/chat/server-store";

const presenceSchema = z.object({
  action: z.literal("heartbeat"),
  teamMemberId: z.string().min(1),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(40),
});

const acceptSchema = z.object({
  action: z.literal("accept"),
  conversationId: z.string().min(1),
  teamMemberId: z.string().min(1),
});

const claimSchema = z.object({
  action: z.literal("claim"),
  conversationId: z.string().min(1),
  teamMemberId: z.string().min(1),
});

const pollSchema = z.object({
  action: z.literal("poll"),
  teamMemberId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  role: z.string().min(1).max(40).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  presenceSchema,
  acceptSchema,
  claimSchema,
  pollSchema,
]);

/**
 * POST /api/chat/platform/leads
 * Presence heartbeat, accept/claim leads, poll actionable offers.
 */
export async function POST(request: Request) {
  try {
    ensureServerChatPlatformState();
    processLeadRotations();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { success: false, message: "Invalid lead payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    if (input.action === "heartbeat") {
      const presence = heartbeatPresence(input);
      return Response.json({
        success: true,
        data: { presence, online: listOnlineTeamMembers() },
      });
    }

    if (input.action === "accept") {
      const conversation = acceptLeadOffer({
        conversationId: input.conversationId,
        teamMemberId: input.teamMemberId,
      });
      return Response.json({
        success: true,
        message: "Lead accepted — you own this chat",
        data: { conversation },
      });
    }

    if (input.action === "claim") {
      const conversation = claimFloatingLead({
        conversationId: input.conversationId,
        teamMemberId: input.teamMemberId,
      });
      return Response.json({
        success: true,
        message: "Floating lead claimed",
        data: { conversation },
      });
    }

    // poll
    if (input.name && input.role) {
      heartbeatPresence({
        teamMemberId: input.teamMemberId,
        name: input.name,
        role: input.role,
      });
    }
    const actionable = listActionableLeadsForMember(input.teamMemberId);
    return Response.json({
      success: true,
      data: {
        ...actionable,
        online: listOnlineTeamMembers(),
        now: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lead action failed";
    return Response.json({ success: false, message }, { status: 400 });
  }
}

export async function GET() {
  ensureServerChatPlatformState();
  processLeadRotations();
  return Response.json({
    success: true,
    data: {
      online: listOnlineTeamMembers(),
      now: new Date().toISOString(),
    },
  });
}
