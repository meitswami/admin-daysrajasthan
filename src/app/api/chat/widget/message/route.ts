import { leaveOfflineMessage } from "@/modules/chat";
import { resolvePublicWidgetConfig } from "@/modules/chat/public-widget";
import { getServerChatPlatformState, setServerChatPlatformState } from "@/modules/chat/server-store";

/** Offline/manual leave-a-message — no Intelligence. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      key?: string;
      message?: string;
      name?: string;
      email?: string;
    };
    if (!body.key || !body.message?.trim()) {
      return Response.json({ success: false, message: "key and message required" }, { status: 400 });
    }
    const config = await resolvePublicWidgetConfig(body.key);
    if (!config) {
      return Response.json({ success: false, message: "Invalid widget key" }, { status: 401 });
    }

    // Server-side conversation stub
    const state = getServerChatPlatformState();
    if (state) {
      const entry = {
        id: `conv_${Date.now().toString(36)}`,
        websiteId: config.websiteId,
        channel: "manual" as const,
        visitorLabel: body.name || body.email || "Visitor",
        status: "queued" as const,
        messageCount: 1,
        lastMessagePreview: body.message.trim().slice(0, 120),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setServerChatPlatformState({
        ...state,
        conversations: [entry, ...state.conversations],
      });
    } else if (typeof window !== "undefined") {
      leaveOfflineMessage({
        websiteId: config.websiteId,
        visitorLabel: body.name || body.email || "Visitor",
        message: body.message.trim(),
        email: body.email,
      });
    }

    return Response.json({
      success: true,
      message: config.behaviour.offlineMessage,
      data: { ai: false },
    });
  } catch {
    return Response.json({ success: false, message: "Bad request" }, { status: 400 });
  }
}
