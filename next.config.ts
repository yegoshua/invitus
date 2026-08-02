import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "**/assets/icons/**/*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              // svgo drops viewBox whenever width/height are present. Without it
              // an icon sized by CSS (w-7 on a 32-unit grid) is clipped, not scaled.
              svgoConfig: {
                plugins: [
                  {
                    name: "preset-default",
                    params: { overrides: { removeViewBox: false } },
                  },
                ],
              },
            },
          },
        ],
        as: "*.js",
      },
    },
  },
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
      {
        // KeyCRM file storage (product photos)
        protocol: "https",
        hostname: "*.api.keycrm.app",
        pathname: "/file-storage/**",
      },
    ],
  },
};

export default nextConfig;
