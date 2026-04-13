"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 240);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      aria-label="맨 위로 이동"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed",
        bottom: 100,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid #DFE3E6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 49,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.2s, transform 0.15s",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.border = "1px solid #FD5108";
        el.style.boxShadow = "0 4px 16px rgba(253,81,8,0.2)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.border = "1px solid #DFE3E6";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        el.style.transform = "translateY(0)";
      }}
    >
      <ArrowUp size={16} color="#FD5108" />
    </button>
  );
}
