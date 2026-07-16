import { Header } from "@/components/layout/header";
import { InquiriesView } from "@/components/modules/inquiries-view";
import { packageInquiries } from "@/lib/data";

export default function InquiriesPage() {
  return (
    <>
      <Header title="Inquiry Forms" description="Package inquiries linked to downloads & WhatsApp" />
      <InquiriesView initialData={packageInquiries} />
    </>
  );
}
