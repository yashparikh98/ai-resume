import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "canvas"],
  },
  // Increase API route body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: false,
  },
};

export default nextConfig;
