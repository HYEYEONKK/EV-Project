"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";

type Step = "email" | "otp" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const { sendOTP, verifyOTP, register, isAuthenticated, isEmailRegistered } = useAuthStore();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState(["", "", "", "", "", ""]);
  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mockOTP, setMockOTP]   = useState<string | null>(null); // 데모용 OTP 표시
  const [resendSec, setResendSec] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const otpRefs  = useRef<(HTMLInputElement | null)[]>([]);

  /* 이미 로그인된 경우 */
  useEffect(() => {
    if (isAuthenticated) router.replace("/input");
  }, [isAuthenticated, router]);

  /* 비디오 루프 */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const h = () => { if (v.duration && v.currentTime > v.duration - 0.2) v.currentTime = 0; };
    v.addEventListener("timeupdate", h);
    return () => v.removeEventListener("timeupdate", h);
  }, []);

  /* 재전송 카운트다운 */
  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  /* ── Step 1: 이메일 제출 ─────────────────────────────────── */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("이메일을 입력해 주세요."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("올바른 이메일 형식이 아닙니다."); return; }
    if (isEmailRegistered(email)) { setError("이미 가입된 이메일입니다. 로그인 페이지를 이용해 주세요."); return; }
    setLoading(true);
    const res = await sendOTP(email);
    setLoading(false);
    if (res.success) {
      setMockOTP(res.otp ?? null);
      setResendSec(60);
      setStep("otp");
    } else {
      setError(res.error ?? "오류가 발생했습니다.");
    }
  };

  /* ── Step 2: OTP 인증 ────────────────────────────────────── */
  const handleOTPInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOTPKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };
  const handleOTPPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("6자리 인증 코드를 모두 입력해 주세요."); return; }
    setError("");
    setLoading(true);
    const res = await verifyOTP(email, code);
    setLoading(false);
    if (res.success) {
      setStep("profile");
    } else {
      setError(res.error ?? "인증 실패");
    }
  };

  const handleResend = async () => {
    if (resendSec > 0) return;
    setLoading(true);
    const res = await sendOTP(email);
    setLoading(false);
    if (res.success) {
      setMockOTP(res.otp ?? null);
      setResendSec(60);
      setOtp(["", "", "", "", "", ""]);
      setError("");
    }
  };

  /* ── Step 3: 프로필 & 비밀번호 ───────────────────────────── */
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { setError("이름을 입력해 주세요."); return; }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== confirmPw) { setError("비밀번호가 일치하지 않습니다."); return; }
    setError("");
    setLoading(true);
    const res = await register(email, password, name);
    setLoading(false);
    if (res.success) {
      router.replace("/home");
    } else {
      setError(res.error ?? "회원가입에 실패했습니다.");
    }
  };

  /* ── 진행률 표시 ─────────────────────────────────────────── */
  const stepIdx = step === "email" ? 0 : step === "otp" ? 1 : 2;
  const STEPS = ["이메일 확인", "본인 인증", "계정 설정"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* 배경 비디오 */}
      <video
        ref={videoRef}
        src="/bg.mp4"
        autoPlay muted loop playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.45)", backdropFilter: "blur(2px)", zIndex: 1 }} />

      {/* 카드 */}
      <div
        style={{
          position: "relative", zIndex: 2,
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "44px 40px 40px",
          width: "100%", maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
          border: "1px solid #DFE3E6",
        }}
      >
        {/* 로고 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <img src="/pwc-logo.svg" alt="PwC" style={{ height: 26, width: "auto" }} />
          <span style={{ display: "inline-flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#2d2d2d", letterSpacing: "-0.3px" }}>Easy View</span>
            <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 1, position: "relative", top: "-7px" }}>
              <svg width="10" height="10" viewBox="0 0 100 100" fill="none">
                <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
              </svg>
            </span>
          </span>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  backgroundColor: i < stepIdx ? "#FD5108" : i === stepIdx ? "#FD5108" : "#EEEFF1",
                  color: i <= stepIdx ? "#fff" : "#A1A8B3",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  flexShrink: 0,
                  transition: "background-color 0.2s",
                }}>
                  {i < stepIdx ? <CheckIcon /> : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i <= stepIdx ? "#FD5108" : "#A1A8B3", fontWeight: i === stepIdx ? 600 : 400, whiteSpace: "nowrap" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, backgroundColor: i < stepIdx ? "#FD5108" : "#EEEFF1", margin: "0 8px", marginBottom: 20, transition: "background-color 0.2s" }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: 이메일 ── */}
        {step === "email" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", marginBottom: 6, letterSpacing: "-0.3px" }}>이메일 확인</h1>
            <p style={{ fontSize: 13, color: "#A1A8B3", marginBottom: 24 }}>
              가입할 이메일 주소를 입력하면 인증 코드를 보내드립니다.
            </p>
            <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>이메일</label>
                <input
                  type="email"
                  placeholder="example@pwc.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FD5108")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#DFE3E6")}
                />
              </div>
              {error && <ErrorBox msg={error} />}
              <SubmitBtn loading={loading} label="인증 코드 발송" />
            </form>
          </>
        )}

        {/* ── Step 2: OTP ── */}
        {step === "otp" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", marginBottom: 6, letterSpacing: "-0.3px" }}>이메일 인증</h1>
            <p style={{ fontSize: 13, color: "#A1A8B3", marginBottom: 6 }}>
              <strong style={{ color: "#1A1A2E" }}>{email}</strong>으로 발송된<br />
              6자리 인증 코드를 입력해 주세요.
            </p>

            {/* 데모용 OTP 힌트 */}
            {mockOTP && (
              <div style={{
                backgroundColor: "#FFF5ED", border: "1px solid #FFAA72", borderRadius: 8,
                padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#FD5108",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>🔑</span>
                <span><strong>데모 인증 코드:</strong> {mockOTP}</span>
              </div>
            )}

            <form onSubmit={handleOTPSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* OTP 입력 박스 */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }} onPaste={handleOTPPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPInput(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    style={{
                      width: 48, height: 56, textAlign: "center",
                      fontSize: 22, fontWeight: 700, color: "#1A1A2E",
                      border: `2px solid ${digit ? "#FD5108" : "#DFE3E6"}`,
                      borderRadius: 10, outline: "none",
                      caretColor: "#FD5108",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FD5108")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = digit ? "#FD5108" : "#DFE3E6")}
                  />
                ))}
              </div>

              {error && <ErrorBox msg={error} />}
              <SubmitBtn loading={loading} label="인증 확인" />
            </form>

            {/* 재전송 */}
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#A1A8B3" }}>
              코드를 받지 못하셨나요?{" "}
              <button
                onClick={handleResend}
                disabled={resendSec > 0}
                style={{
                  background: "none", border: "none", cursor: resendSec > 0 ? "default" : "pointer",
                  color: resendSec > 0 ? "#A1A8B3" : "#FD5108", fontWeight: 600, fontSize: 13, padding: 0,
                }}
              >
                {resendSec > 0 ? `재전송 (${resendSec}s)` : "재전송"}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: 이름 + 비밀번호 ── */}
        {step === "profile" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", marginBottom: 6, letterSpacing: "-0.3px" }}>계정 설정</h1>
            <p style={{ fontSize: 13, color: "#A1A8B3", marginBottom: 24 }}>이름과 비밀번호를 설정하면 가입이 완료됩니다.</p>
            <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>이름</label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FD5108")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#DFE3E6")}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>비밀번호</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="8자 이상 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FD5108")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#DFE3E6")}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A1A8B3", padding: 0 }}>
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {/* 비밀번호 강도 표시 */}
                {password && (
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < pwStrength(password) ? pwColor(password) : "#EEEFF1", transition: "background-color 0.2s" }} />
                    ))}
                    <span style={{ fontSize: 11, color: pwColor(password), marginLeft: 4 }}>{pwLabel(password)}</span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>비밀번호 확인</label>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  style={{ ...inputStyle, borderColor: confirmPw && confirmPw !== password ? "#FF4747" : "#DFE3E6" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = confirmPw && confirmPw !== password ? "#FF4747" : "#FD5108")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = confirmPw && confirmPw !== password ? "#FF4747" : "#DFE3E6")}
                />
                {confirmPw && confirmPw !== password && (
                  <p style={{ fontSize: 12, color: "#FF4747", marginTop: 4 }}>비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
              {error && <ErrorBox msg={error} />}
              <SubmitBtn loading={loading} label="가입 완료" />
            </form>
          </>
        )}

        {/* 로그인 링크 */}
        <p style={{ textAlign: "center", fontSize: 14, color: "#374151", marginTop: 24 }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "#FD5108", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ── 공통 스타일/컴포넌트 ─────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #DFE3E6", borderRadius: 8,
  padding: "11px 14px", fontSize: 14, color: "#1A1A2E",
  outline: "none", transition: "border-color 0.15s",
  backgroundColor: "#fff",
};

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ backgroundColor: "#FFF5F5", border: "1px solid #FFD0D0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FF4747" }}>
      {msg}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        backgroundColor: loading ? "#FFAA72" : "#FD5108",
        color: "#fff", border: "none", borderRadius: 8,
        padding: "13px 0", fontSize: 15, fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background-color 0.15s", letterSpacing: "-0.2px",
      }}
      onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "#e04400"; }}
      onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "#FD5108"; }}
    >
      {loading ? "처리 중..." : label}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
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

/* ── 비밀번호 강도 ─────────────────────────────────────────────── */
function pwStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
function pwColor(pw: string): string {
  const s = pwStrength(pw);
  if (s <= 1) return "#FF4747";
  if (s === 2) return "#FE7C39";
  if (s === 3) return "#FFAA72";
  return "#16C784";
}
function pwLabel(pw: string): string {
  const s = pwStrength(pw);
  if (s <= 1) return "약함";
  if (s === 2) return "보통";
  if (s === 3) return "강함";
  return "매우 강함";
}
