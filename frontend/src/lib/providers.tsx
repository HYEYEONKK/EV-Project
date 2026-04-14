"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useInitFilters } from "@/lib/hooks/useInitFilters";
import { wakeUpServer, isServerReady } from "@/lib/api/client";

function InitFilters() {
  useInitFilters();
  return null;
}

/** Pages that need backend data — show wake-up overlay on these */
const DATA_PAGES = [
  "/home", "/summary", "/pnl", "/bs", "/voucher", "/scenario",
  "/audit", "/sales", "/budget", "/period", "/financial", "/dashboard",
];

function ServerWakeGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const needsData = DATA_PAGES.some((p) => pathname.startsWith(p));
  const [ready, setReady] = useState(isServerReady());
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!needsData || ready) return;
    wakeUpServer().then(() => setReady(true));
  }, [needsData, ready]);

  useEffect(() => {
    if (ready || !needsData) return;
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 500);
    return () => clearInterval(id);
  }, [ready, needsData]);

  if (needsData && !ready) {
    return (
      <>
        {children}
        <div style={{
          position: "fixed", inset: 0, background: "rgba(255,255,255,0.92)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, border: "4px solid #EEEFF1", borderTopColor: "#FD5108",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
              margin: "0 auto 24px",
            }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", marginBottom: 6 }}>
              서버에 연결 중입니다{dots}
            </p>
            <p style={{ fontSize: 13, color: "#A1A8B3" }}>
              최초 접속 시 최대 1~2분 소요될 수 있습니다
            </p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            retry: 3,
            retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <InitFilters />
      <ServerWakeGuard>{children}</ServerWakeGuard>
    </QueryClientProvider>
  );
}
