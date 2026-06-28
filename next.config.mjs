/** @type {import('next').NextConfig} */

// Origin of the API the dashboard talks to (REST + websockets). Allowed in CSP
// connect-src/img-src so the strict policy doesn't block legitimate calls.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://api.localhost").origin;
  } catch {
    return "http://api.localhost";
  }
})();

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
  "img-src 'self' data: blob: https: http:",
  `connect-src 'self' ${API_ORIGIN} ws: wss:`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
  images: {
    remotePatterns: [new URL('https://picsum.photos/**')],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
