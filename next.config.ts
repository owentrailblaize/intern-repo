import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during builds (run separately if needed)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
