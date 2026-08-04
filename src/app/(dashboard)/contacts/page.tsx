import { Header } from "@/components/layout/header";
import { ContactsView } from "@/components/modules/contacts-view";
import { getContactQueries } from "@/lib/data/service";

export default async function ContactsPage() {
  const initialData = await getContactQueries();
  return (
    <>
      <Header title="Contact Us" description="Website contact form submissions" />
      <ContactsView initialData={initialData} />
    </>
  );
}
