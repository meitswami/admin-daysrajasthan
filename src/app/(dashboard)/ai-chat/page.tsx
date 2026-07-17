import { Header } from "@/components/layout/header";
import { ChatPlatformShell } from "@/components/modules/chat-platform/chat-platform-shell";

export default function AiChatDashboardPage() {
  return (
    <>
      <Header
        title="AI & Chat"
        description="Chat Platform management — widget, embed, keys (online AI)"
      />
      <ChatPlatformShell section="dashboard" />
    </>
  );
}
