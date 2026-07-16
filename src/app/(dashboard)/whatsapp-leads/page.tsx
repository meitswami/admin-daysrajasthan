import { Header } from "@/components/layout/header";
import { WhatsappView } from "@/components/modules/whatsapp-view";
import { whatsappLeads } from "@/lib/data";

export default function WhatsappLeadsPage() {
  return (
    <>
      <Header title="WhatsApp Leads" description="Click-to-chat leads synced to Travel CRM" />
      <WhatsappView initialData={whatsappLeads} />
    </>
  );
}
