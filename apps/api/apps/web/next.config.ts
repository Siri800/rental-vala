import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.platform === "win32" ? { distDir: "../../../../../../tmp/rental-vala-next" } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;