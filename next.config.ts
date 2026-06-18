import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Pendo session replay CSP — https://support.pendo.io/hc/en-us/articles/360032209131 */
function buildContentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://cdn.pendo.io",
    "https://pendo-io-static.storage.googleapis.com",
    "https://*.storage.googleapis.com",
    "https://data.pendo.io",
  ];
  if (isDev) {
    // React / Next dev tooling (stack traces, Turbopack) requires eval in development only.
    scriptSrc.push("'unsafe-eval'");
  }

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "https://data.pendo.io",
    "https://cdn.pendo.io",
    "https://*.pendo.io",
    "https://*.static.pendo.io",
    "https://pendo-static-6679533350748160.storage.googleapis.com",
    "https://content-6679533350748160.static.pendo.io",
    "https://*.storage.googleapis.com",
    "wss://*.supabase.co",
  ];
  if (isDev) {
    connectSrc.push("ws://localhost:*", "http://localhost:*", "ws://127.0.0.1:*", "http://127.0.0.1:*");
  }

  return [
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://pendo-io-static.storage.googleapis.com https://*.storage.googleapis.com https://*.static.pendo.io",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://cdn.pendo.io https://data.pendo.io https://*.pendo.io https://*.storage.googleapis.com",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src blob:",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
];

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // The /og route reads public/images/seal.png from disk at runtime. Vercel's
  // file tracer can miss fs-read assets, so include it explicitly to avoid ENOENT.
  outputFileTracingIncludes: {
    "/og": ["./public/images/seal.png"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
