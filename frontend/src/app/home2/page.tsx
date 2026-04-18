"use client";
import { useRef, useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Concentric Rings hero graphic
───────────────────────────────────────────────────────────── */
function ConcentricRings() {
  const staticRings = [100, 200, 310, 440, 590, 760, 950];
  const rippleRings = [0, 1, 2, 3];
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute", width: 12, height: 12, borderRadius: "50%",
        background: "rgba(253,81,8,0.55)",
        boxShadow: "0 0 20px 6px rgba(253,81,8,0.18)",
      }} />
      {staticRings.map((r, i) => (
        <div key={`s${i}`} style={{
          position: "absolute",
          width: r * 2, height: r * 2, borderRadius: "50%",
          border: `${i < 3 ? 1.5 : 1}px solid rgba(253,81,8,${0.28 - i * 0.032})`,
          animation: `ring-breathe ${3.5 + i * 0.4}s ease-in-out ${i * 0.35}s infinite`,
        }} />
      ))}
      {rippleRings.map((i) => (
        <div key={`r${i}`} style={{
          position: "absolute",
          width: 200, height: 200, borderRadius: "50%",
          border: "1.5px solid rgba(253,81,8,0.5)",
          animation: `ring-expand 5s ease-out ${i * 1.25}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HeroBg — background video
───────────────────────────────────────────────────────────── */
function HeroBg() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration && v.currentTime > v.duration - 0.2) {
        v.currentTime = 0;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
    >
      <source src="/bg.mp4" type="video/mp4" />
    </video>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function Home2Page() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-breathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.04); }
        }
        @keyframes ring-expand {
          0%   { transform: scale(0.7); opacity: 0.9; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        main { background-color: transparent !important; }
      `}</style>

      <HeroBg />

      <div
        ref={heroRef}
        style={{
          position: "relative",
          zIndex: 2,
          height: "100vh",
          background: "transparent",
          overflow: "hidden",
          margin: "calc(-100px - 24px) -24px 0",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 0,
            marginTop: -20,
          }}
        >
          <div style={{ width: "100%", maxWidth: 680, padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {/* Eyebrow */}
            <span style={{
              fontSize: 17, color: "#FD5108", letterSpacing: 1, fontWeight: 400,
              animation: "heroFadeIn 0.5s ease 0.1s both",
              marginBottom: -4,
              marginTop: 16,
            }}>
              데이터 분석의 새로운 기준
            </span>

            {/* Title */}
            <h1 style={{
              fontSize: "clamp(32px, 4.2vw, 48px)", fontWeight: 700, color: "#1A1A2E",
              letterSpacing: -1.5, margin: 0, lineHeight: 1.2, textAlign: "center",
              animation: "heroFadeIn 0.6s ease 0.25s both",
              whiteSpace: "nowrap",
            }}>
              Welcome to Easy View
              <svg
                viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{
                  display: "inline-block",
                  width:  "clamp(18px, 2.4vw, 28px)",
                  height: "clamp(18px, 2.4vw, 28px)",
                  marginLeft: "0.04em",
                  marginRight: "0.04em",
                  verticalAlign: "super",
                  position: "relative",
                  top: "-0.08em",
                }}
              >
                <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
              </svg>
            </h1>

            {/* Description */}
            <p style={{
              fontSize: 17, color: "#6B7280", margin: 0, textAlign: "center",
              lineHeight: 1.6, letterSpacing: "-0.2px",
              animation: "heroFadeIn 0.6s ease 0.48s both",
            }}>
              재무 결산부터 원가, 영업 분석까지 —&nbsp;
              <span style={{ color: "#1A1A2E", fontWeight: 600 }}>원하는 데이터를 한눈에</span> 확인하세요!
            </p>
          </div>
        </div>

        {/* 하단 그라데이션 페이드 */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 120, zIndex: 1,
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,248,245,0.7) 70%, #FFF4EE 100%)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}
