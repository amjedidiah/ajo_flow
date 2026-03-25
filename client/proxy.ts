import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  REFRESH_COOKIE_NAME,
  SESSION_HINT_COOKIE,
  USER_ID_HEADER,
  USER_EMAIL_HEADER,
} from "@/lib/auth-constants";

const PROTECTED_PREFIXES = ["/dashboard", "/my-pods", "/payment"];
const AUTH_PAGES = new Set(["/login", "/register"]);

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");

interface TokenPayload {
  id: string;
  email: string;
}

async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.id === "string" && typeof payload.email === "string") {
      return { id: payload.id, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.has(pathname);

  // Verify the refresh token if present (same-origin deployments).
  const user = refreshToken ? await verifyRefreshToken(refreshToken) : null;

  // In cross-origin deployments (e.g. Vercel frontend + Render backend),
  // the HttpOnly refresh_token cookie lives on the API domain and is
  // invisible here. Fall back to the session_hint cookie which the client
  // sets after a successful login.
  const hasSession = !!user || request.cookies.has(SESSION_HINT_COOKIE);

  // Enforce auth gate for protected routes
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/register
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user) {
    // Forward verified user identity as request headers for Server Components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(USER_ID_HEADER, user.id);
    requestHeaders.set(USER_EMAIL_HEADER, user.email);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // No valid session and no hint — clean up stale hint cookie if present
  if (!hasSession && request.cookies.has(SESSION_HINT_COOKIE)) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_HINT_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     * This lets the proxy run on public pages too so it can forward
     * the verified user identity to Server Components via request headers.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
