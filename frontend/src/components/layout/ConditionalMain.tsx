"use client";
import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/signup"];

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isAuth) {
    // 인증 페이지: padding 없는 full-screen (페이지가 직접 fixed layout 사용)
    return <>{children}</>;
  }

  return (
    <main
      className="min-h-screen p-6"
      style={{ paddingTop: "calc(100px + 24px)", backgroundColor: "#F5F7F8" }}
    >
      {children}
    </main>
  );
}
