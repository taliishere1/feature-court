import type { NextConfig } from "next";

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
  // Pendo session replay CSP — see https://support.pendo.io/hc/en-us/articles/360032209131
  {
    key: "Content-Security-Policy",
    value: [
      "script-src 'self' 'unsafe-inline' https://cdn.pendo.io https://pendo-io-static.storage.googleapis.com https://*.storage.googleapis.com https://data.pendo.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://pendo-io-static.storage.googleapis.com https://*.storage.googleapis.com https://*.static.pendo.io",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://cdn.pendo.io https://data.pendo.io https://*.pendo.io https://*.storage.googleapis.com",
      "connect-src 'self' https://*.supabase.co https://data.pendo.io https://cdn.pendo.io https://*.pendo.io https://*.storage.googleapis.com wss://*.supabase.co",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
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
