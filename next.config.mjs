import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */

// Origin of the API the dashboard talks to (REST + websockets). Allowed in CSP
// connect-src/img-src so the strict policy doesn't block legitimate calls.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "http://api.localhost";
  }
})();

// The websocket origin the realtime client actually dials (socket.js does
// io(API_URL)). Deriving it from the API origin lets connect-src name exactly
// that host instead of the blanket `ws: wss:` that allowed a socket to ANY
// origin — the one hole in an otherwise pinned egress policy.
const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

// Baseline CSP for an admin dashboard. 'unsafe-inline'/'unsafe-eval' are kept for
// script-src because Next.js + framer-motion need them without a nonce pipeline;
// the policy still hardens frame-ancestors, object-src, base-uri and pins the
// network egress (connect/img) to self + the API origin. Tighten to a nonce-based
// script-src as a follow-up.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "font-src 'self' data:",
  // `https:` stays: account avatars are arbitrary operator-supplied URLs and
  // render as plain <img>. `http:` is dropped so a plaintext-image URL can't be
  // used as a mixed-content tracking/exfil beacon on an HTTPS dashboard.
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${API_ORIGIN} ${WS_ORIGIN}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Every route here is operator-only — the sign-in screen plus the dashboard,
  // project database/storage/accounts browsers and settings — so none of it
  // belongs in a search index. Sent as a header rather than only as a <meta> tag
  // so it also covers middleware's auth redirects and non-HTML responses, which
  // never render the root layout.
  //
  // Deliberately paired with a crawlable robots.txt (there is none, so
  // everything is allowed): a "Disallow: /" would stop crawlers fetching these
  // URLs at all, and a URL they can't fetch is one whose noindex they can never
  // read — it could still be listed from an external link. Crawlable + noindex
  // is the combination that actually removes a page from the index.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

// HSTS is only emitted in production. It's dropped in dev/HTTP and ships WITHOUT
// `includeSubDomains` so it can't accidentally force-upgrade sibling http-only
// subdomains if the dashboard is ever served once over TLS on an apex domain.
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000",
  });
}

const nextConfig = {
  // This app is checked out inside a larger workspace that has its own
  // package-lock.json, so Next's "nearest lockfile" heuristic picks that outer
  // directory as the root and traces files from outside the dashboard. Pin the
  // root to this app.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),

  // No next/image component points at picsum — the avatar fallbacks are plain
  // <img> and don't consult remotePatterns — so the placeholder-era allowance
  // is dead config. Removed.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
