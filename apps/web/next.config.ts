import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for the Docker runtime image.
  output: "standalone",
  // Trace dependencies from the monorepo root so workspace packages are included.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: { position: "bottom-right" },
  typedRoutes: false,
  experimental: {
    // Uploads go through the BFF route handler; keep headroom above the API
    // limits (25 MB project files, 100 MB chat attachments).
    proxyClientMaxBodySize: "110mb",
  },
};

export default nextConfig;
