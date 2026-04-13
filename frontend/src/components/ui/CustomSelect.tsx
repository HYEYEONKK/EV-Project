"use client";
import { useState, useRef, useEffect } from "react";

interface Option {
  label: string;
  value: string | number;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (v: string | number) => void;
  options: (string | number | Option)[];
  placeholder?: string;
  fontSize?: number;
}

export default function CustomSelect({ value, onChange, options, placeholder, fontSize: fz }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const normalized: Option[] = options.map(o =>
    typeof o === "object" ? o : { label: String(o), value: o }
  );

  const current = normalized.find(o => o.value === value);
  const label = current?.label ?? placeholder ?? String(value);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-md px-3 py-1 transition-colors"
        style={{
          fontSize: fz ?? 14, fontWeight: 400, letterSpacing: "-0.3px",
          border: "1px solid #DFE3E6",
          backgroundColor: open ? "#F5F7F8" : "#fff",
          color: "#374151", outline: "none", whiteSpace: "nowrap", cursor: "pointer",
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A1A8B3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 300,
          backgroundColor: "#fff", border: "1px solid #DFE3E6",
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          padding: "6px 0", minWidth: "100%", maxHeight: 240, overflowY: "auto",
        }}>
          {normalized.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-4 py-2 transition-colors"
                style={{
                  fontSize: fz ?? 14, letterSpacing: "-0.3px",
                  backgroundColor: active ? "#FFF5ED" : "transparent",
                  color: active ? "#FD5108" : "#374151",
                  fontWeight: active ? 600 : 400,
                  outline: "none", cursor: "pointer",
                  border: "none", display: "block", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? "#FFF5ED" : "transparent"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
