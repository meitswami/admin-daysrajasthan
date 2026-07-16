import type { ChatMessageModel, PresentationBlock } from "../types";
import { mapChatMessage } from "../blocks";
import type { RendererInputBlock } from "../types";

export function renderChatBlocks(blocks: RendererInputBlock[]): ChatMessageModel[] {
  return blocks
    .filter((b) =>
      ["message", "summary", "suggestion", "fallback_browse", "crm_hint"].includes(b.kind)
    )
    .map(mapChatMessage);
}

export function isChatPresentation(block: PresentationBlock): block is ChatMessageModel {
  return block.kind === "chat_message";
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "chat" as const,
  description: "Chat message presentation models",
} as const;
