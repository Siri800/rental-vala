import os from 'node:os';
import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir:
    process.env.NODE_ENV === 'production'
      ? path.relative(process.cwd(), path.join(os.tmpdir(), 'rental-vala-next'))
      : '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};
export default nextConfig;
