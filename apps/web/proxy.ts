import { NextResponse, type NextRequest } from "next/server";

const REFRESH_COOKIE = "pm_rt";
const PUBLIC_PATHS = ["/login"];

/**
 * Optimistic routing gate: only checks for the presence of a session cookie.
 * Real authentication happens in the API on every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (hasSession && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  // Skip the BFF, Next internals and public files (robots.txt, images…).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)"],
};
