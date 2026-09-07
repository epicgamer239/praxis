import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only disable caching in local dev so phone/PWA tests pick up changes.
  async headers() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
