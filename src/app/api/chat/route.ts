import { processChatTurn } from "@/modules/chat/conversation/orchestrate";
import { chatRequestSchema } from "@/modules/chat/schemas";
import { runGateway } from "@/modules/api-gateway";

/**
 * POST /api/chat
 * Widget → Gateway → Intelligence → Renderer → DTO
 */
export async function POST(request: Request) {
  return runGateway(request, {
    routeId: "chat.message",
    auth: "anonymous",
    permission: "public.chat",
    featureFlag: "chat.message",
    schema: chatRequestSchema,
    handler: async ({ input }) => {
      const result = await processChatTurn({
        key: input.key,
        message: input.message,
        sessionId: input.sessionId,
        name: input.name,
        email: input.email,
      });
      return {
        data: {
          mode: result.mode,
          sessionId: result.sessionId,
          replyText: result.replyText,
          presentation: result.presentation,
          analytics: result.analytics,
          offlineQueued: result.offlineQueued ?? false,
          intelligence: result.intelligence
            ? {
                intent: result.intelligence.intent,
                provider: result.intelligence.provider,
                usedFallback: result.intelligence.usedFallback,
                warnings: result.intelligence.warnings,
                blocks: result.intelligence.blocks,
              }
            : null,
        },
        message: result.mode === "offline" ? "Message queued" : "OK",
        status: 200,
      };
    },
  });
}
