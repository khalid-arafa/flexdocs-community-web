import { NextResponse } from "next/server";

// Decode a JWT payload WITHOUT verifying the signature. The API is the real
// authority on token validity — here we only read `exp` so an expired or
// malformed session is bounced to /login at the edge, before any protected
// page is ever sent to the browser. (Runs in the Edge runtime, so we use the
// global `atob` rather than Node's Buffer.)
function decodeJwtPayload(token) {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isSessionValid(exp) {
  if (typeof exp !== "number") return false;
  // `exp` is seconds since epoch; reject anything already expired.
  return exp * 1000 > Date.now();
}

// The `user` cookie has two shapes depending on how the dashboard authenticates
// (see utils/auth.js). In Bearer/dev mode it carries the JWT, so read `exp` from
// the token. In cookie-auth/HTTPS mode the token lives only in an httpOnly
// cookie on the API's origin — invisible here — so the dashboard stores the
// token's `exp` alongside the profile instead. Support both.
function sessionExpFromCookie(userCookieValue) {
  try {
    const parsed = JSON.parse(userCookieValue);
    if (parsed?.token) return decodeJwtPayload(parsed.token)?.exp ?? null;
    return typeof parsed?.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  const userCookie = request.cookies.get("user")?.value;
  const exp = userCookie ? sessionExpFromCookie(userCookie) : null;

  const authenticated = isSessionValid(exp);

  // Not (or no longer) authenticated → straight to the login page. Clearing the
  // cookie stops a stale/expired token from flashing the dashboard again.
  if (!authenticated && path !== "/login") {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("user");
    return response;
  }

  // Already signed in → keep them out of the login page.
  if (authenticated && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
