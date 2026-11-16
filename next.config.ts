import type { NextConfig } from "next";

// GitHub Pages serves a project site from /<repo>/, so the deploy workflow sets
// NEXT_PUBLIC_BASE_PATH and PAGES_EXPORT. Local dev and Vercel leave both unset.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(process.env.PAGES_EXPORT === "1" ? { output: "export" as const, trailingSlash: true } : {}),
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
