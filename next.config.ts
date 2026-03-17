import type { NextConfig } from "next";

const FASTAPI_BASE_URL = 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${FASTAPI_BASE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
