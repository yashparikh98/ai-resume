import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Moved from experimental.serverComponentsExternalPackages in Next.js 16
  serverExternalPackages: ["pdf-parse", "canvas"],
  // Add empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
