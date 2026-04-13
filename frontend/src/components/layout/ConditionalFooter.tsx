"use client";
import { usePathname } from "next/navigation";
import Footer from "./Footer";

const AUTH_PATHS = ["/login", "/signup", "/input", "/output"];

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/" || AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <Footer />;
}
