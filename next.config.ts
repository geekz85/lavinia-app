import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ensure API routes work correctly on Vercel
  output: "standalone",
};

export default nextConfig;