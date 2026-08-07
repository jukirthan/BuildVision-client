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

export default nextConfig;
