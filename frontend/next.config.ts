import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load the Autter Node SDK from node_modules instead of bundling it into
  // every route, so instances share the one `registerAutter` started.
  serverExternalPackages: ["@autter/runtime-node"],
};

export default nextConfig;
