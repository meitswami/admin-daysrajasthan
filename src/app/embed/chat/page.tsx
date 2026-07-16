"use client";

import { OfflineChatWidget } from "@/components/modules/chat-platform/offline-widget";

export default function EmbedChatPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <OfflineChatWidget />
    </div>
  );
}
