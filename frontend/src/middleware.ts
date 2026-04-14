import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 로그인 필요한 경로 (INPUT, OUTPUT만)
const AUTH_REQUIRED = ["/input", "/output"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 에셋, Next.js 내부 경로 제외
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.\w+$/)
  ) {
    return NextResponse.next();
  }

  // INPUT, OUTPUT만 로그인 필요
  if (AUTH_REQUIRED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const isAuthenticated = request.cookies.get("ev_auth")?.value === "1";
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 나머지는 모두 통과 (랜딩, 로그인, 대시보드 등)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
