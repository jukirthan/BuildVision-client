/** @type {import('next').NextConfig} */
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
        destination: "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
