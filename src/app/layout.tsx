import type { Metadata } from "next";
import { DM_Sans, Nunito_Sans, Poltawski_Nowy } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SiteSettingsProvider } from "@/components/providers/site-settings-provider";
import { SystemProvider } from "@/components/providers/system-provider";
import { DynamicSiteMeta } from "@/components/providers/dynamic-site-meta";
import { ChunkLoadRecovery } from "@/components/providers/chunk-load-recovery";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

/** Theme 2 quotation (SenduserviewData3) uses Nunito Sans */
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800", "900"],
  variable: "--font-nunito-sans",
});

/** Theme 3 quotation (SenduserviewData4) uses Poltawski Nowy */
const poltawskiNowy = Poltawski_Nowy({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poltawski-nowy",
});

export const metadata: Metadata = {
  title: "Travel Days Rajasthan — Admin Panel",
  description: "Website admin panel for Travel Days Rajasthan — itineraries, inquiries, blogs & CRM sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${nunitoSans.variable} ${poltawskiNowy.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">
        <ChunkLoadRecovery />
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
