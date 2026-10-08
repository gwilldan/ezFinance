import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "openai"],
  // pdf.js loads its native canvas binary and worker at runtime, which file
  // tracing can't follow; without them uploads fail on Vercel with
  // "DOMMatrix is not defined".
  outputFileTracingIncludes: {
    "/api/upload": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-*/**",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
}

export default nextConfig
