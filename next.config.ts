import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
