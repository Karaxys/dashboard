import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle under .next/standalone/.
  // The Docker runtime image only needs that dir + .next/static + public —
  // cuts image size from ~500 MB to ~120 MB.
  output: "standalone",
};

export default nextConfig;
