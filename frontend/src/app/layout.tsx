import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/lib/providers";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Easy View",
  description: "ABC Company 재무 분석 BI 대시보드",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`h-full ${plusJakarta.variable}`}>
      <body className="h-full">
        <Providers>
          {/* TopNav is fixed: 56px nav + 48px subtab = 104px total */}
          <TopNav />
          <main
            className="min-h-screen p-6"
            style={{ paddingTop: "calc(104px + 24px)", backgroundColor: "#F5F7F8" }}
          >
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
