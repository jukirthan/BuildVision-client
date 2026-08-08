import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BuildVision — Design Tomorrow's Buildings Today",
    short_name: "BuildVision",
    description:
      "AI-powered 3D building planning, structural validation, quantity estimation, and collaboration.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#2563eb",
    background_color: "#f8fafc",
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icons/buildvision-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/buildvision-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/buildvision-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/buildvision-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open the BuildVision workspace dashboard.",
        url: "/dashboard",
        icons: [{ src: "/icons/buildvision-192.png", sizes: "192x192" }],
      },
      {
        name: "Projects",
        short_name: "Projects",
        description: "Browse projects and buildings.",
        url: "/projects",
        icons: [{ src: "/icons/buildvision-192.png", sizes: "192x192" }],
      },
      {
        name: "3D Planner",
        short_name: "Planner",
        description: "Open the interactive structural planner.",
        url: "/planner",
        icons: [{ src: "/icons/buildvision-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/buildvision-home.png",
        sizes: "1280x720",
        type: "image/png",
      },
    ],
  };
}
