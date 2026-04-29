import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: ["localhost", "172.27.32.1", "172.16.10.27"],
};

export default nextConfig;
