"use client";
import { usePathname } from "next/navigation";
import Footer from "./Footer";

const AUTH_PATHS = ["/login", "/signup"];

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <Footer />;
}
