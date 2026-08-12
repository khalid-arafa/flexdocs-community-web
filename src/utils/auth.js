import { API_URL } from '@/constants';
import Cookies from 'js-cookie';
import { usesCookieAuth } from './authMode';

function getCookieOptions() {
  const isSecure = typeof window !== "undefined"
    ? window.location.protocol === "https:"
    : process.env.NODE_ENV === "production";
  return {
    expires: 7,
    sameSite: "Lax",
    secure: isSecure,
  };
}

// Read a JWT's `exp` (seconds since epoch) WITHOUT verifying the signature.
// Used only so the edge middleware can bounce an expired session before a
// protected page renders; the API remains the real authority on validity.
function decodeJwtExp(token) {
  try {
    const seg = String(token).split(".")[1];
    if (!seg) return null;
    const base64 = seg.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

// Persist whatever the browser needs to keep after a successful login/register.
//
// In cookie-auth (HTTPS) mode the JWT itself is NOT stored anywhere JS can read
// it — the API set it as an httpOnly cookie. We keep only a non-sensitive
// profile plus the token's `exp` (for the edge middleware's gate) in the `user`
// cookie, and the CSRF token — which the cross-origin API cannot hand us via a
// readable cookie — in a `csrf` cookie so api.js can echo it on unsafe requests.
//
// In Bearer (dev/HTTP) mode we keep the legacy shape: the full body, token
// included, in the `user` cookie.
function persistSession(body) {
  const { token, csrfToken, ...profile } = body || {};
  if (csrfToken) Cookies.set("csrf", csrfToken, getCookieOptions());

  if (usesCookieAuth()) {
    Cookies.set(
      "user",
      JSON.stringify({ ...profile, exp: decodeJwtExp(token) }),
      getCookieOptions()
    );
  } else {
    Cookies.set("user", JSON.stringify(body), getCookieOptions());
  }
}

export const login = async (email, password) => {
  try {
    const result = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Receive (and thereafter send) the httpOnly session cookie the API sets.
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (result.ok) {
      const body = await result.json();
      persistSession(body);
      return {
        ok: true,
        body: body,
      };
    }
    return result
  } catch (error) {
    return { ok: false }
  }
}

export const register = async (name, email, password) => {
  const result = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });
  if (result.ok) {
    const body = await result.json();
    persistSession(body);
    return {
      ok: true,
      body: body,
    };
  }
  return result
}

export const logout = () => {
  // Capture the CSRF token BEFORE clearing it — /logout is an unsafe method, so
  // the API's CSRF gate rejects a cookie-bearing POST without a matching header.
  const csrf = Cookies.get("csrf");
  Cookies.remove("user", { sameSite: "Lax" });
  Cookies.remove("csrf", { sameSite: "Lax" });
  // Best-effort server-side teardown of the httpOnly session cookie (a no-op in
  // dev, where the session is Bearer). keepalive lets it finish even as the
  // logout redirect navigates away; failures are ignored — the local session is
  // already gone.
  try {
    fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "x-csrf-token": csrf } : {},
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export const logoutAndRedirect = (path = "/login") => {
  logout();
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.location.replace(path);
  }
}
