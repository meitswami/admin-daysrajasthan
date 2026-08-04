import { Header } from "@/components/layout/header";
import { InquiriesView } from "@/components/modules/inquiries-view";
import { getPackageInquiries } from "@/lib/data/service";

export default async function InquiriesPage() {
  const initialData = await getPackageInquiries();
  return (
    <>
      <Header title="Inquiry Forms" description="Package inquiries linked to downloads & WhatsApp" />
      <InquiriesView initialData={initialData} />
    </>
  );
}
