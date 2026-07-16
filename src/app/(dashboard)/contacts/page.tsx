import { Header } from "@/components/layout/header";
import { ContactsView } from "@/components/modules/contacts-view";
import { contactQueries } from "@/lib/data";

export default function ContactsPage() {
  return (
    <>
      <Header title="Contact Us" description="Website contact form submissions" />
      <ContactsView initialData={contactQueries} />
    </>
  );
}
