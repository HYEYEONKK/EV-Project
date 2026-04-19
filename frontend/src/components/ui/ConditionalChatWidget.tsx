"use client";
import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";

const HIDE_PATHS = ["/login", "/signup", "/input", "/output"];

export default function ConditionalChatWidget() {
  const pathname = usePathname();
  if (pathname === "/" || HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (pathname === "/home2" || pathname === "/home2/admin" || pathname.startsWith("/home2/admin/")) return null;
  return <ChatWidget />;
}
