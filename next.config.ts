import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "canvas"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Add polyfills for server-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
