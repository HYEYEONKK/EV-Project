import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import TopNav from "@/components/layout/TopNav";

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
    <html lang="ko" className="h-full">
      <body className="h-full">
        <Providers>
          {/* TopNav is fixed: 56px nav + 40px breadcrumb = 96px total */}
          <TopNav />
          <main
            className="min-h-screen p-6"
            style={{ paddingTop: "calc(96px + 24px)", backgroundColor: "#F5F7F8" }}
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
