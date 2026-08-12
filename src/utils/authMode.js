// Which session mechanism the dashboard uses against the (cross-origin) API.
//
// - HTTPS (production): the session is an httpOnly cookie the API sets. It is
//   SameSite=None so the browser attaches it to our cross-origin API calls, and
//   JavaScript never holds the token — so an XSS on the dashboard cannot steal
//   it. Requests go out with credentials:"include" and no Authorization header.
//
// - Plain HTTP (local dev): a SameSite=None cookie requires Secure, which HTTP
//   cannot satisfy, so the browser would drop it. There we fall back to the
//   legacy flow: the token is kept in the JS-readable `user` cookie and sent as
//   an Authorization: Bearer header.
//
// `window.isSecureContext` is deliberately NOT used — it is also true for
// http://localhost, where a None+Secure cookie still cannot be set. The gate is
// specifically "is the page itself served over https".
export function usesCookieAuth() {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}
