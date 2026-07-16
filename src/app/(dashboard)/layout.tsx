import { Sidebar, MobileDrawer } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { DashboardAccessGuard } from "@/components/layout/dashboard-access-guard";
import { AdminLocalChatWidget } from "@/components/modules/chat-platform/admin-local-chat-widget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <DashboardAccessGuard>
        <div className="flex min-h-screen bg-[#f8f7f4] lg:pl-64">
          <Sidebar />
          <MobileDrawer />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
        {/* Local testing — same script embed as external websites */}
        <AdminLocalChatWidget />
      </DashboardAccessGuard>
    </MobileNavProvider>
  );
}
