import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // This allows Next.js to serve the image without trying to 
    // "optimize" it through its internal server, bypassing the private IP check.
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.strapi.io",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.strapiapp.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.media.strapiapp.com",
      },
    ],
  },
};

export default nextConfig;
