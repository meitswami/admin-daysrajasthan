import { Header } from "@/components/layout/header";
import { WhatsappView } from "@/components/modules/whatsapp-view";
import { getPackageInquiries, getWhatsappLeads } from "@/lib/data/service";

export default async function WhatsappLeadsPage() {
  const [initialData, linkedInquiries] = await Promise.all([
    getWhatsappLeads(),
    getPackageInquiries(),
  ]);
  return (
    <>
      <Header title="WhatsApp Leads" description="Click-to-chat leads synced to Travel CRM" />
      <WhatsappView initialData={initialData} linkedInquiries={linkedInquiries} />
    </>
  );
}
