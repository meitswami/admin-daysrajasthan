import { Header } from "@/components/layout/header";
import { ReportsView } from "@/components/modules/reports-view";

export default function ReportsPage() {
  return (
    <>
      <Header
        title="Reports"
        description="Bookings, payments, inquiries, optional itineraries & emails"
      />
      <ReportsView />
    </>
  );
}
