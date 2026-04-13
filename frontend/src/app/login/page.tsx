"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, logout, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  /* 로그인 페이지 진입 시 기존 세션 정리 — 항상 새로 로그인 */
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 비디오 끊김 없는 루프 */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handler = () => {
      if (v.duration && v.currentTime > v.duration - 0.2) v.currentTime = 0;
    };
    v.addEventListener("timeupdate", handler);
    return () => v.removeEventListener("timeupdate", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("이메일과 비밀번호를 입력해 주세요."); return; }
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      const from = params.get("from") ?? "/input";
      router.replace(from);
    } else {
      setError(res.error ?? "로그인에 실패했습니다.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* 배경 비디오 */}
      <video
        ref={videoRef}
        src="/bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      />

      {/* 오버레이 */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.45)", backdropFilter: "blur(2px)", zIndex: 1 }} />

      {/* 카드 */}
      <div
        style={{
          position: "relative", zIndex: 2,
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "44px 40px 40px",
          width: "100%", maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
          border: "1px solid #DFE3E6",
        }}
      >
        {/* 로고 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <img src="/pwc-logo.svg" alt="PwC" style={{ height: 26, width: "auto" }} />
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#2d2d2d", letterSpacing: "-0.3px" }}>Easy View</span>
            <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 1, position: "relative", top: "-7px" }}>
              <svg width="10" height="10" viewBox="0 0 100 100" fill="none">
                <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
              </svg>
            </span>
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", marginBottom: 6, letterSpacing: "-0.3px" }}>
          로그인
        </h1>
        <p style={{ fontSize: 14, color: "#A1A8B3", marginBottom: 28 }}>
          계정에 로그인하여 재무 분석 대시보드를 이용하세요.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 이메일 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
              이메일
            </label>
            <input
              type="email"
              placeholder="example@pwc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #DFE3E6", borderRadius: 8,
                padding: "11px 14px", fontSize: 14, color: "#1A1A2E",
                outline: "none", transition: "border-color 0.15s",
                backgroundColor: "#fff",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FD5108")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#DFE3E6")}
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
              비밀번호
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1px solid #DFE3E6", borderRadius: 8,
                  padding: "11px 44px 11px 14px", fontSize: 14, color: "#1A1A2E",
                  outline: "none", transition: "border-color 0.15s",
                  backgroundColor: "#fff",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#FD5108")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#DFE3E6")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A1A8B3", padding: 0 }}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{
              backgroundColor: "#FFF5F5", border: "1px solid #FFD0D0", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, color: "#FF4747",
            }}>
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#FFAA72" : "#FD5108",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.15s", marginTop: 4,
              letterSpacing: "-0.2px",
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "#e04400"; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "#FD5108"; }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "#EEEFF1" }} />
          <span style={{ fontSize: 12, color: "#A1A8B3" }}>또는</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#EEEFF1" }} />
        </div>

        {/* 회원가입 링크 */}
        <p style={{ textAlign: "center", fontSize: 14, color: "#374151" }}>
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            style={{ color: "#FD5108", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

/* ── 아이콘 ─────────────────────────────────────────────────── */
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
