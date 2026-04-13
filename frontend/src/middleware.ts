import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/input", "/output"];

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

  // 랜딩 페이지 (root)는 항상 공개
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 인증 쿠키 확인
  const isAuthenticated = request.cookies.get("ev_auth")?.value === "1";

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
