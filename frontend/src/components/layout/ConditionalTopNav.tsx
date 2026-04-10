"use client";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

const AUTH_PATHS = ["/login", "/signup"];

export default function ConditionalTopNav() {
  const pathname = usePathname();
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <TopNav />;
}
