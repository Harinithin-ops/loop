import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL === "1" ? undefined : "export",

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
