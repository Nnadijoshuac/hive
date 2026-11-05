import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Intel DCAP quote verification ships WASM and must load from node_modules at runtime.
  serverExternalPackages: ['@phala/dcap-qvl'],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
