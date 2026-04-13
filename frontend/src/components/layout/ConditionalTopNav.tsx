"use client";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

const AUTH_PATHS = ["/login", "/signup", "/input", "/output"];

export default function ConditionalTopNav() {
  const pathname = usePathname();
  if (pathname === "/" || AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <TopNav />;
}
