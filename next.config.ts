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
  images: {
    unoptimized: true,
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://rest.api.bible https://bible-api.com https://www.ccel.org https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://accounts.spotify.com https://api.spotify.com",
              "script-src-elem 'self' 'unsafe-inline' https://sdk.scdn.co",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://open.spotify.com https://w.soundcloud.com https://music.youtube.com",
              "media-src 'self' blob: https: mediastream: data:",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
