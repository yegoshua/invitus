import path from "node:path";
import type { NextConfig } from "next";

// The repo root, where the site and the shared code live (ADR 0001). Turbopack
// only compiles files under its root, and file tracing only ships them.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Belt and braces with robots.txt and the meta tag: robots.txt only
          // asks crawlers not to fetch, it does not stop a linked URL being
          // indexed.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
