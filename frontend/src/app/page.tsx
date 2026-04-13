"use client";
import Link from "next/link";

/* ─────────────────────────────────────────────
   Landing Page (정예원 HOME — PwC Design Guide)
───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", color: "#1A1A2E" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 60,
        borderBottom: "1px solid #DFE3E6",
        backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/pwc-logo.svg" alt="PwC" style={{ height: 26 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A2E", paddingLeft: 14, borderLeft: "1px solid #DFE3E6" }}>
            Worldwide Easy View
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <nav style={{ display: "flex", gap: 28 }}>
            <a href="#values" style={{ fontSize: 14, color: "#374151", textDecoration: "none" }}>서비스 소개</a>
            <a href="#how" style={{ fontSize: 14, color: "#374151", textDecoration: "none" }}>사용 방법</a>
            <a href="#video" style={{ fontSize: 14, color: "#374151", textDecoration: "none" }}>소개 영상</a>
            <a href="#contact" style={{ fontSize: 14, color: "#374151", textDecoration: "none" }}>문의하기</a>
          </nav>
          <Link href="/login" style={{
            padding: "8px 20px", fontSize: 13, fontWeight: 600,
            color: "#fff", backgroundColor: "#FD5108",
            border: "none", borderRadius: 6, textDecoration: "none",
          }}>
            로그인
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 48, padding: "80px 48px 80px 80px",
        minHeight: "calc(100vh - 60px)",
        background: "linear-gradient(135deg, #FFF5ED 0%, #ffffff 60%)",
        overflow: "hidden",
      }}>
        <div style={{ flex: 1, maxWidth: 580 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#FD5108", letterSpacing: 1, textTransform: "uppercase", marginBottom: 20 }}>
            PwC 삼일회계법인
          </p>
          <h1 style={{ fontSize: 64, fontWeight: 800, color: "#1A1A2E", lineHeight: 1.15, letterSpacing: -1.5, marginBottom: 24 }}>
            재무 데이터를<br />한눈에 파악하세요
          </h1>
          <p style={{ fontSize: 17, color: "#374151", lineHeight: 1.7, marginBottom: 36 }}>
            삼일회계법인이 개발한 Worldwide Easy View는<br />
            대상 법인의 전표 데이터를 이용하여 다양한 경영정보와<br />
            예외사항을 웹으로 확인하는 정기구독 서비스입니다.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/login" style={{
              padding: "14px 32px", fontSize: 15, fontWeight: 700,
              color: "#fff", backgroundColor: "#FD5108",
              borderRadius: 8, textDecoration: "none",
            }}>
              지금 시작하기
            </Link>
            <a href="#video" style={{ fontSize: 15, fontWeight: 600, color: "#FD5108", textDecoration: "none" }}>
              소개 영상 보기 ▶
            </a>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div style={{ flex: 1, maxWidth: 520 }}>
          <div style={{
            background: "#fff", borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.12)",
            overflow: "hidden", border: "1px solid #DFE3E6",
          }}>
            <div style={{ background: "#F5F7F8", padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #DFE3E6" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#A1A8B3", marginLeft: 8, fontFamily: "monospace" }}>wwev.onrender.com/output</span>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={{ display: "inline-block", background: "#FD5108", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 4 }}>ABC Group</span>
                <div style={{ fontSize: 10, color: "#A1A8B3" }}>가나다 주식회사 · Monthly Summary</div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: "#FFF5ED", borderRadius: 8, padding: "12px 14px", border: "1px solid #FFCDA8" }}>
                  <div style={{ fontSize: 10, color: "#A1A8B3", marginBottom: 4 }}>당월 매출액</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#FD5108" }}>₩ 14,143M</div>
                  <div style={{ fontSize: 10, color: "#16C784", fontWeight: 600, marginTop: 2 }}>▲ 12.7%</div>
                </div>
                <div style={{ flex: 1, background: "#F5F7F8", borderRadius: 8, padding: "12px 14px", border: "1px solid #EEEFF1" }}>
                  <div style={{ fontSize: 10, color: "#A1A8B3", marginBottom: 4 }}>당월 영업이익률</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>(+) 18.3%</div>
                </div>
                <div style={{ flex: 1, background: "#F5F7F8", borderRadius: 8, padding: "12px 14px", border: "1px solid #EEEFF1" }}>
                  <div style={{ fontSize: 10, color: "#A1A8B3", marginBottom: 4 }}>당월 순이익률</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>(+) 24.7%</div>
                </div>
              </div>
              <div style={{ background: "#F5F7F8", borderRadius: 8, padding: 14, border: "1px solid #EEEFF1" }}>
                <div style={{ fontSize: 10, color: "#A1A8B3", marginBottom: 12, fontWeight: 600 }}>월별 매출 추이</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                  {[40,55,48,70,60,65,72,68,75,88].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 9 ? "#FD5108" : "#FFE8D4", borderRadius: "3px 3px 0 0" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section id="values" style={{ padding: "96px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#FD5108", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            왜 Worldwide Easy View인가요?
          </p>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.8, marginBottom: 56 }}>
            4가지 핵심 가치
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[
              { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "신뢰성", desc: "전표 원천 데이터를 직접 이용하여 경영진에게 표준화된 재무정보를 확인할 수 있습니다." },
              { icon: "M22 12 18 12 15 21 9 3 6 12 2 12", title: "효율성", desc: "해외법인 자료의 언어·통화·회계기준의 장벽을 해석하여 쉽게 관리할 수 있습니다.", isPolyline: true },
              { icon: "M5 2 19 2 19 22 5 22Z", title: "간편성", desc: "어디서나 노트북이나 태블릿으로 경영정보를 바로 확인할 수 있습니다." },
              { icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", title: "경제성", desc: "합리적인 금액으로 별도의 ERP 또는 BIS/BI 시스템 없이도 효율적으로 확인이 가능합니다." },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#fff", border: "1px solid #DFE3E6",
                borderRadius: 14, padding: "32px 24px", textAlign: "center",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, background: "#FFF5ED",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 18px", color: "#FD5108",
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={26} height={26}>
                    {item.isPolyline ? <polyline points={item.icon} /> : <path d={item.icon} />}
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1A1A2E", marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: "96px 48px", backgroundColor: "#F5F7F8" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#FD5108", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            사용 방법
          </p>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.8, marginBottom: 56 }}>
            3단계로 끝나는 경영 분석
          </h2>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {[
              { num: "01", title: "데이터 요청 및 업로드", desc: "분개장(JE)과 시산표(TB) 파일을 업로드하고 기준월과 회사명을 선택합니다. SAP, Oracle, 더존 등 20개 이상 ERP 지원." },
              { num: "02", title: "자동 분석", desc: "시스템이 데이터를 자동으로 처리하여 손익, 재무상태표, 예외사항, 거래처 분석을 수행합니다." },
              { num: "03", title: "보고서 확인", desc: "웹 또는 모바일에서 시각화된 경영정보 보고서를 확인하고 팀원과 바로 공유합니다." },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ flex: 1, padding: "32px 28px", background: "#fff", borderRadius: 14, border: "1px solid #DFE3E6" }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#FFE8D4", marginBottom: 12, lineHeight: 1 }}>{step.num}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E", marginBottom: 10 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{step.desc}</p>
                </div>
                {i < 2 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#FD5108", padding: "0 8px", marginTop: 48, flexShrink: 0 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video */}
      <section id="video" style={{ padding: "96px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#FD5108", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            소개 영상
          </p>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.8, marginBottom: 16 }}>
            Worldwide Easy View 살펴보기
          </h2>
          <p style={{ fontSize: 16, color: "#374151", marginBottom: 48 }}>
            서비스가 궁금하다면? 3분 34초 영상으로 확인해보세요.
          </p>
          <div style={{ width: "100%", maxWidth: 800, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 64px rgba(0,0,0,0.12)", aspectRatio: "16/9" }}>
            <iframe
              src="https://www.youtube.com/embed/t8I87XRpLsU"
              title="Worldwide Easy View 소개 영상"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(135deg, #FD5108, #FE7C39)", padding: "96px 48px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: -0.8 }}>지금 바로 시작해보세요</h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)" }}>Excel 파일만 있으면 누구나 전문적인 경영 분석 보고서를 만들 수 있습니다.</p>
          <Link href="/login" style={{
            padding: "16px 48px", fontSize: 16, fontWeight: 700,
            color: "#FD5108", backgroundColor: "#fff",
            borderRadius: 8, textDecoration: "none", marginTop: 8,
          }}>
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ padding: "96px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#FD5108", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>문의하기</p>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.8, marginBottom: 56 }}>더 궁금한 점이 있으신가요?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { href: "mailto:kr_easyview@pwc.com", label: "Service Team", value: "kr_easyview@pwc.com" },
              { href: "https://forms.gle/PpEhGX7V1mdCzLRk9", label: "설명회 신청", value: "신청 폼 바로가기 →" },
              { href: "https://forms.office.com/r/4hXi5yKYyD", label: "피드백", value: "의견 보내기 →" },
            ].map((c, i) => (
              <a key={i} href={c.href} target={c.href.startsWith("mailto") ? undefined : "_blank"} style={{
                display: "flex", alignItems: "center", gap: 16, padding: 24,
                background: "#fff", border: "1px solid #DFE3E6", borderRadius: 14,
                textDecoration: "none", color: "inherit",
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFF5ED", display: "flex", alignItems: "center", justifyContent: "center", color: "#FD5108", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#A1A8B3", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{c.value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "#1A1A2E", padding: "32px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#A1A8B3", fontSize: 14 }}>
            <img src="/pwc-logo.svg" alt="PwC" style={{ height: 22, filter: "brightness(0) invert(1)", opacity: 0.7 }} />
            <span>Worldwide Easy View</span>
          </div>
          <p style={{ fontSize: 13, color: "#A1A8B3" }}>© 2026 PwC 삼일회계법인. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
