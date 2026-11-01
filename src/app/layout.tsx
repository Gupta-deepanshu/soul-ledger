import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { TopNav } from "@/components/layout/TopNav";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Footer } from "@/components/layout/Footer";
import { isSampleData } from "@/lib/deadlock/client";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Soul Ledger", template: "%s · Soul Ledger" },
  description:
    "Deadlock hero and item meta, live matches, match reports and player profiles. A fan project built on deadlock-api.com.",
};

export const viewport: Viewport = {
  themeColor: "#0F0D0B",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const sample = isSampleData();
  return (
    <html
      lang="en"
      className={cn("dark h-full antialiased", geist.variable, geistMono.variable, instrumentSerif.variable)}
    >
      <body className="grain min-h-full bg-ink text-fg">
        {/* Entrance animations start hidden; without JS they would never reveal. */}
        <noscript>
          <style>{"[data-entrance]{opacity:1!important;transform:none!important}[data-ink-part]{opacity:1!important;animation:none!important}"}</style>
        </noscript>
        <AppShell>
          <TopNav sample={sample} />
          <main className="flex-1">{children}</main>
          <Footer sample={sample} />
        </AppShell>
        <MobileTabBar />
      </body>
    </html>
  );
}
