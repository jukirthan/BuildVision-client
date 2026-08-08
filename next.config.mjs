import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import withSerwistInit from "@serwist/next";

/**
 * A stable build revision lets Serwist invalidate the offline document and
 * manifest when a new frontend is deployed. Vercel exposes the commit SHA;
 * local builds fall back to the current git commit and then a stable marker.
 */
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout?.trim() ||
  "local-build";

const publicAssetRevision = (relativePath) => {
  try {
    return createHash("sha256")
      .update(readFileSync(path.join(process.cwd(), "public", relativePath)))
      .digest("hex")
      .slice(0, 16);
  } catch {
    return revision;
  }
};

/** @type {import('next').NextConfig} */
const API_ORIGIN = (
  process.env.API_PROXY_ORIGIN ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://buildvision-api-production-97a8.up.railway.app"
).replace(/\/$/, "");

const nextConfig = {
  // Prevent Next's own trailing-slash normalization from redirecting
  // /api/* proxy requests (the Flask backend's routes are trailing-slash
  // canonical). Without this, POST/PUT requests through the proxy can
  // bounce through a cross-origin redirect hop and lose the Authorization
  // header, e.g. breaking "create project".
  skipTrailingSlashRedirect: true,
  images: {
    // Optimized variants are immutable — cache them for 31 days so the
    // server doesn't re-encode photography on every cold request.
    minimumCacheTTL: 2678400,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  // A service worker from a previous production build must never control
  // development pages or make HMR/API debugging confusing.
  disable: process.env.NODE_ENV !== "production",
  register: false,
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  scope: "/",
  // Only the explicit offline document, manifest, and small app identity
  // assets are precached. Protected pages are network-only and public pages
  // are cached at runtime.
  additionalPrecacheEntries: [
    { url: "/offline", revision },
    { url: "/manifest.webmanifest", revision },
    ...[
      "icons/buildvision-192.png",
      "icons/buildvision-192-maskable.png",
      "icons/buildvision-512.png",
      "icons/buildvision-512-maskable.png",
      "favicon.png",
      "favicon-32.png",
      "apple-touch-icon.png",
    ].map((asset) => ({
      url: `/${asset}`,
      revision: publicAssetRevision(asset),
    })),
  ],
  // Keep the build from precaching unusually large chunks or media files.
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
});

export default withSerwist(nextConfig);
