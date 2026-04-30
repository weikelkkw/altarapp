import type { NextConfig } from "next";
import path from "path";
import os from "os";

// Ensure node binary is findable by Turbopack's child processes (nvm compatibility)
// Only prepend nvm path if it actually exists on this machine
const nvmNodeBin = path.join(os.homedir(), ".nvm/versions/node/v24.14.1/bin");
try {
  const { statSync } = require("fs");
  statSync(nvmNodeBin);
  process.env.PATH = `${nvmNodeBin}:${process.env.PATH ?? ""}`;
} catch {
  // nvm not present or different node version — skip path injection
}


const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  // Don't expose framework. Small win, but cheap.
  poweredByHeader: false,
  // Tree-shake "barrel" imports from icon/animation libs so we don't ship the
  // whole package when only a handful of names are used.
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "react-icons",
    ],
  },
  images: {
    // We render bitmaps with raw <img> right now (next/image rollout is
    // post-launch work); leave the optimizer disabled until that conversion
    // happens so we don't end up double-billing or hiding broken paths.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Block legacy plugin cross-domain access (Flash/Silverlight/Acrobat).
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          // Restrict powerful platform features. Mic stays self for VoiceInput;
          // most others are hard-denied.
          {
            key: "Permissions-Policy",
            value: "accelerometer=(), autoplay=(self), camera=(), display-capture=(), encrypted-media=(self), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), midi=(), payment=(), picture-in-picture=(self), publickey-credentials-get=(self), screen-wake-lock=(self), sync-xhr=(self), usb=(), xr-spatial-tracking=()",
          },
          // Cross-Origin-Opener-Policy isolates the browsing context so a popup
          // can't reach back into our window via opener.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Keep our responses from being read by unrelated origins.
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' / 'unsafe-eval' still required for Next.js
              // hydration + framer-motion; tighten with nonces in a later audit.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://rest.api.bible https://bible-api.com https://www.ccel.org https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://accounts.spotify.com https://api.spotify.com",
              "script-src-elem 'self' 'unsafe-inline' https://sdk.scdn.co",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://open.spotify.com https://w.soundcloud.com https://music.youtube.com",
              "media-src 'self' blob: https: mediastream: data:",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      // No caching or indexing on API routes.
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
