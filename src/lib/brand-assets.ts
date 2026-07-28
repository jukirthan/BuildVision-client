/**
 * Architecture photography served from /public/assets.
 * `sunset` is the flagship hero shot; the rest give each route its own
 * identity while keeping one cool-toned, professional palette.
 */
export const BRAND_ASSETS = {
  sunset: {
    src: "/assets/arch-sunset.webp",
    alt: "Curved glass tower glowing at sunset above a reflecting pool",
  },
  hero: {
    src: "/assets/arch-hero.jpg",
    alt: "Spiralling glass atrium seen from below",
  },
  modern: {
    src: "/assets/arch-modern.jpg",
    alt: "Parametric timber lattice canopy at golden hour",
  },
  skyline: {
    src: "/assets/arch-skyline.jpg",
    alt: "Glass office towers converging against a bright sky",
  },
  detail: {
    src: "/assets/arch-detail.jpg",
    alt: "Cluster of high-rise facades from a low angle",
  },
} as const;

export type BrandAssetKey = keyof typeof BRAND_ASSETS;

/** One photo per route so every page has its own backdrop. */
export const PAGE_ASSETS: Record<string, BrandAssetKey> = {
  "/": "sunset",
  "/login": "sunset",
  "/signup": "sunset",

  "/dashboard": "sunset",
  "/projects": "skyline",
  "/planner": "hero",
  "/reports": "detail",
  "/material-estimator": "modern",
  "/camera-measurement": "detail",
  "/ai-assistant": "hero",
  "/team": "modern",
  "/settings": "detail",
  "/profile": "hero",

  "/features": "hero",
  "/pricing": "skyline",
  "/docs": "detail",
  "/blog": "modern",
  "/contact": "sunset",
  "/about": "skyline",
};

export function assetForPath(pathname: string): BrandAssetKey {
  return PAGE_ASSETS[pathname] ?? "sunset";
}

/**
 * Focal point per photo — each shot places its subject differently, so a
 * single "center" crop would cut the interesting part off on wide screens.
 */
export const ASSET_FOCUS: Record<BrandAssetKey, string> = {
  sunset: "70% 45%",
  hero: "center 40%",
  modern: "center 35%",
  skyline: "center 30%",
  detail: "center 45%",
};
