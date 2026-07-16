/** `chat/conversation` — Conversation module contract */
export const SUBMODULE = {
  parent: "chat" as const,
  id: "conversation" as const,
  description: "Conversation turns — Gateway → Intelligence → Renderer",
} as const;
