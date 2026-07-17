import {
  getServerChatPlatformState,
  mergeAdminConfigIntoServer,
} from "@/modules/chat/server-store";
import type { ChatPlatformState } from "@/modules/chat";
import { processLeadRotations } from "@/modules/chat/lead-routing";
import { listOnlineTeamMembers } from "@/modules/chat/presence";

/** Sync admin platform config into server memory without wiping live query inbox. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatPlatformState;
    if (!body || !Array.isArray(body.websites) || !Array.isArray(body.keys)) {
      return Response.json({ success: false, message: "Invalid state" }, { status: 400 });
    }
    const next = mergeAdminConfigIntoServer(body);
    processLeadRotations();
    return Response.json({
      success: true,
      message: "Synced",
      data: {
        websites: next.websites.length,
        keys: next.keys.length,
        conversations: next.conversations.length,
        messages: next.messages.length,
      },
    });
  } catch {
    return Response.json({ success: false, message: "Bad request" }, { status: 400 });
  }
}

/** Superadmin inbox pull — conversations, messages, sessions, settings. */
export async function GET() {
  processLeadRotations();
  const state = getServerChatPlatformState();
  return Response.json({
    success: true,
    data: state
      ? {
          synced: true,
          websites: state.websites.length,
          keys: state.keys.length,
          conversations: state.conversations,
          feedback: state.feedback,
          messages: state.messages,
          sessions: state.sessions,
          settings: state.settings,
          providers: state.providers,
          online: listOnlineTeamMembers(),
        }
      : {
          synced: false,
          conversations: [],
          feedback: [],
          messages: [],
          sessions: [],
          settings: null,
          providers: [],
          online: [],
        },
  });
}
