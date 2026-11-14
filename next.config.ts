import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* The floating dev badge overlaps CTAs on mobile — the demo stays clean. */
  devIndicators: false,
};

export default nextConfig;
