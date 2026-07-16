import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SiteSettingsProvider } from "@/components/providers/site-settings-provider";
import { SystemProvider } from "@/components/providers/system-provider";
import { DynamicSiteMeta } from "@/components/providers/dynamic-site-meta";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Travel Days Rajasthan — Admin Panel",
  description: "Website admin panel for Travel Days Rajasthan — itineraries, inquiries, blogs & CRM sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <SiteSettingsProvider>
          <SystemProvider>
            <DynamicSiteMeta />
            <ToastProvider>{children}</ToastProvider>
          </SystemProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
