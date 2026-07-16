import { Header } from "@/components/layout/header";
import { WebSettingsView } from "@/components/modules/web-settings-view";

export default function WebSettingsPage() {
  return (
    <>
      <Header title="Web Settings" description="Website branding, pages & contact details" />
      <WebSettingsView />
    </>
  );
}
