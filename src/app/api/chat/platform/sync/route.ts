import { getServerChatPlatformState, setServerChatPlatformState } from "@/modules/chat/server-store";
import type { ChatPlatformState } from "@/modules/chat";

/** Sync admin platform state into server memory for widget key resolution. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatPlatformState;
    if (!body || !Array.isArray(body.websites) || !Array.isArray(body.keys)) {
      return Response.json({ success: false, message: "Invalid state" }, { status: 400 });
    }
    setServerChatPlatformState(body);
    return Response.json({
      success: true,
      message: "Synced",
      data: { websites: body.websites.length, keys: body.keys.length },
    });
  } catch {
    return Response.json({ success: false, message: "Bad request" }, { status: 400 });
  }
}

export async function GET() {
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
        }
      : { synced: false, conversations: [], feedback: [] },
  });
}
