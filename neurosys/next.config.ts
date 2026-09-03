import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    output: "export",
    assetPrefix: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "./",
  };
}
