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

// Shout once per page load when the dashboard is running over plain HTTP, where
// the session degrades to a JS-readable token (see persistSession below). This
// is aimed at whoever deployed the console — the fix is TLS, not a code change.
let warnedAboutInsecureSession = false;
function warnInsecureTokenStorage() {
  if (warnedAboutInsecureSession) return;
  warnedAboutInsecureSession = true;
  console.warn(
    "[FlexDocs] Insecure session: this console is served over plain HTTP, so " +
      "the admin JWT is stored in a JavaScript-readable cookie and is sent as " +
      "an Authorization: Bearer header. Any XSS on this page can steal it and " +
      "impersonate you. Deploy the console behind HTTPS — over TLS the API " +
      "keeps the token in an httpOnly, SameSite=None cookie protected by a " +
      "CSRF token, and JavaScript never sees it."
  );
}

// Warn on load rather than only at login, so an operator who is already signed
// in still sees it every time the console is opened.
if (typeof window !== "undefined" && !usesCookieAuth()) {
  warnInsecureTokenStorage();
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
    // KNOWN, DELIBERATE RISK — HTTP-only fallback.
    //
    // Over plain HTTP the browser refuses the SameSite=None cookie the API
    // would otherwise set (None requires Secure), so there is no way to keep
    // the token out of JavaScript's reach while still authenticating the
    // cross-origin API calls. The whole body — token included — therefore goes
    // into the JS-readable `user` cookie and rides on the Authorization header,
    // which means an XSS on this page can exfiltrate a full admin session.
    //
    // This is NOT fixed by changing storage: localStorage/sessionStorage/memory
    // are equally readable by injected script, and the token must survive a
    // reload for the edge middleware's gate. The real mitigation is TLS, which
    // flips this whole branch off (see authMode.js), so we make the exposure
    // loud rather than silent.
    warnInsecureTokenStorage();
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
  // Close every open realtime socket. `logout()` is also reached from a
  // client-side redirect (UserSidebar), which does NOT reload the page, so
  // without this the sockets survive logout and keep reconnecting as the
  // signed-out user. Imported lazily to keep socket.io-client out of bundles
  // that only need `login` (the login page imports this module too), and
  // best-effort like the fetch above — teardown must never block signing out.
  import("./socket")
    .then((m) => m.clearSockets())
    .catch(() => {});
}

export const logoutAndRedirect = (path = "/login") => {
  logout();
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.location.replace(path);
  }
}
