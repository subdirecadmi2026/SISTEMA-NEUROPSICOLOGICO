import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite previews vía túneles públicos durante desarrollo/demo.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "sachawasi.loca.lt",
  ],
};

export default nextConfig;
