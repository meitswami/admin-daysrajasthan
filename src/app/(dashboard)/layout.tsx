import { Sidebar, MobileDrawer } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { DashboardAccessGuard } from "@/components/layout/dashboard-access-guard";
import { ChatLeadAlerts } from "@/components/modules/chat-platform/chat-lead-alerts";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <DashboardAccessGuard>
        <div className="flex min-h-screen bg-[#f8f7f4] lg:pl-64">
          <Sidebar />
          <MobileDrawer />
          <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip">{children}</div>
        </div>
        {/* Chat lead accept / rotate / claim + admin SWAL alerts */}
        <ChatLeadAlerts />
      </DashboardAccessGuard>
    </MobileNavProvider>
  );
}
