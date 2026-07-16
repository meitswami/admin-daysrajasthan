import { Header } from "@/components/layout/header";
import { ChatPlatformShell } from "@/components/modules/chat-platform/chat-platform-shell";

const TITLES: Record<string, string> = {
  widget: "Widget Settings",
  appearance: "Appearance",
  behaviour: "Behaviour",
  embed: "Embed",
  "api-keys": "API Keys",
  domains: "Allowed Domains",
  "knowledge-scope": "Knowledge Scope",
  providers: "AI Providers",
  prompts: "Prompt Management",
  analytics: "Analytics",
  conversations: "Conversations",
  feedback: "Feedback",
  settings: "Chat Settings",
};

export default async function AiChatSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = TITLES[section] ?? "AI & Chat";
  const allowed = Object.keys(TITLES);
  const safe = (allowed.includes(section) ? section : "widget") as
    | "widget"
    | "appearance"
    | "behaviour"
    | "embed"
    | "api-keys"
    | "domains"
    | "knowledge-scope"
    | "providers"
    | "prompts"
    | "analytics"
    | "conversations"
    | "feedback"
    | "settings";

  return (
    <>
      <Header title={title} description="AI & Chat · Website Platform" />
      <ChatPlatformShell section={safe} />
    </>
  );
}
