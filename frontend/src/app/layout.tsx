import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/lib/providers";
import ConditionalTopNav from "@/components/layout/ConditionalTopNav";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import ConditionalMain from "@/components/layout/ConditionalMain";
import ChatWidget from "@/components/ui/ChatWidget";
import ScrollToTop from "@/components/ui/ScrollToTop";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Easy View+",
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
          {/* TopNav is fixed: 56px nav + 44px subtab = 100px total */}
          <ConditionalTopNav />
          <ConditionalMain>
            {children}
          </ConditionalMain>
          <ConditionalFooter />
          <ScrollToTop />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
