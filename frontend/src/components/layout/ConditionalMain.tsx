"use client";
import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/signup", "/input", "/output"];

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/" || AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isHome2 = pathname === "/home2" || pathname.startsWith("/home2/");

  if (isAuth) {
    return <>{children}</>;
  }

  if (isHome2) {
    return (
      <main
        className="min-h-screen"
        style={{ paddingTop: 56, backgroundColor: "#fff" }}
      >
        {children}
      </main>
    );
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
