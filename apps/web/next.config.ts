import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: { position: "bottom-right" },
  typedRoutes: false,
  experimental: {
    // Uploads go through the BFF route handler; keep headroom above the API limit.
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
