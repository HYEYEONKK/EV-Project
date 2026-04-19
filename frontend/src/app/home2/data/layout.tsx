"use client";
import Sidebar2 from "@/components/layout/Sidebar2";

export default function DataLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", width: "100%" }}>
      <Sidebar2 />
      <div style={{ flex: 1, minHeight: "calc(100vh - 56px)" }}>
        {children}
      </div>
    </div>
  );
}
