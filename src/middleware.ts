import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require an authenticated user
const PROTECTED_PREFIXES = [
  "/home",
  "/settings",
  "/profile",
  "/notifications",
  "/events/create",
  "/events/mine",
  "/events/saved",
  "/dashboard",
];

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasAuth =
    request.cookies.has("cc_auth") ||
    request.cookies.has("accessToken");

  // 1. Protect private routes against unauthenticated access
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtected && !hasAuth) {
    const loginUrl = new URL("/login", request.url);
    const returnTarget = pathname + (search || "");
    loginUrl.searchParams.set("redirect", returnTarget);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect logged-in users away from /login or /register
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAuthRoute && hasAuth) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static build files)
     * - _next/image (image optimization files)
     * - favicon.ico (browser icon)
     * - public files (images, icons, robots.txt, sw.js)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|images|sw.js).*)",
  ],
};
