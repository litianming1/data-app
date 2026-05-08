import type { NextConfig } from "next";

const isTauriBuild = process.env.TAURI_BUILD === "true";

const nextConfig: NextConfig = {
  /* config options here */
  output: isTauriBuild ? "export" : "standalone",
  images: isTauriBuild ? { unoptimized: true } : undefined,
  reactCompiler: true,
  allowedDevOrigins: ["localhost", "172.27.32.1", "172.16.10.27"],
};

export default nextConfig;
