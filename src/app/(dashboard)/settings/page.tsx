import { Header } from "@/components/layout/header";
import { SettingsView } from "@/components/modules/settings-view";

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" description="Admin panel, SMTP, CRM integration & APIs" />
      <SettingsView />
    </>
  );
}
