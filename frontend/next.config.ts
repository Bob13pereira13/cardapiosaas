import type { NextConfig } from "next";
import path from "node:path";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cardapiopedeai.com.br';
const apiHostname = (() => {
  try {
    return new URL(apiUrl).hostname;
  } catch {
    return 'api.cardapiopedeai.com.br';
  }
})();

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: apiHostname,
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
