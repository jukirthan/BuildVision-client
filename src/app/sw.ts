/// <reference lib="webworker" />

import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  setCacheNameDetails,
} from "serwist";
import type {
  HTTPMethod,
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Derive the runtime cache namespace from the build's precache manifest.
 * Revisioned Next assets are safe to cache long-term, while a new build gets
 * a new namespace and removes the previous BuildVision runtime caches.
 */
function hashManifest(entries: (PrecacheEntry | string)[] | undefined) {
  const value = JSON.stringify(entries ?? []);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const PRECACHE_ENTRIES = self.__SW_MANIFEST;
const CACHE_VERSION = hashManifest(PRECACHE_ENTRIES);
const CACHE_PREFIX = "buildvision-";

setCacheNameDetails({
  prefix: "buildvision",
  suffix: CACHE_VERSION,
});

const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/about",
  "/blog",
  "/contact",
  "/docs",
  "/features",
  "/login",
  "/offline",
  "/pricing",
  "/signup",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`))
  );
}

const expiration = (maxEntries: number, maxAgeSeconds: number) =>
  new ExpirationPlugin({
    maxEntries,
    maxAgeSeconds,
    maxAgeFrom: "last-used",
  });

const apiMethods: HTTPMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

/**
 * Every API method is explicitly network-only. This is intentionally stricter
 * than Serwist's Next default, which caches same-origin GET APIs. BuildVision
 * API responses may contain account, project, design, or admin data.
 */
const apiRoutes: RuntimeCaching[] = apiMethods.map((method) => ({
  matcher: ({ sameOrigin, url: { pathname } }) =>
    sameOrigin && pathname.startsWith("/api/"),
  method,
  handler: new NetworkOnly(),
}));

const runtimeCaching: RuntimeCaching[] = [
  ...apiRoutes,
  {
    matcher: ({ sameOrigin, url: { pathname } }) =>
      sameOrigin &&
      (pathname === "/manifest.webmanifest" ||
        pathname === "/apple-touch-icon.png" ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/icons/")),
    method: "GET",
    handler: new CacheFirst({
      cacheName: "app-icons",
      plugins: [expiration(16, 30 * 24 * 60 * 60)],
    }),
  },
  {
    matcher: ({ sameOrigin, request, url: { pathname } }) =>
      sameOrigin &&
      request.destination === "font" &&
      !pathname.startsWith("/api/"),
    method: "GET",
    handler: new StaleWhileRevalidate({
      cacheName: "public-fonts",
      plugins: [expiration(12, 30 * 24 * 60 * 60)],
    }),
  },
  {
    matcher: ({ sameOrigin, request, url: { pathname } }) =>
      sameOrigin &&
      request.destination === "image" &&
      !pathname.startsWith("/api/") &&
      !/\.(?:glb|gltf|bin)$/i.test(pathname),
    method: "GET",
    handler: new StaleWhileRevalidate({
      cacheName: "public-images",
      plugins: [expiration(48, 7 * 24 * 60 * 60)],
    }),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) =>
      sameOrigin && pathname.startsWith("/_next/static/"),
    method: "GET",
    handler: new CacheFirst({
      cacheName: "next-static-assets",
      plugins: [expiration(128, 365 * 24 * 60 * 60)],
    }),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) =>
      sameOrigin && /\.(?:glb|gltf|bin|mp4|webm)$/i.test(pathname),
    method: "GET",
    handler: new NetworkOnly(),
  },
  {
    // Cache only public navigations. Protected HTML/RSC is never stored.
    matcher: ({ sameOrigin, request, url: { pathname } }) =>
      sameOrigin && request.mode === "navigate" && isPublicRoute(pathname),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: "public-pages",
      networkTimeoutSeconds: 4,
      plugins: [expiration(16, 24 * 60 * 60)],
    }),
  },
  {
    // Preserve already-visited public App Router transitions without caching
    // protected RSC payloads or API responses.
    matcher: ({ sameOrigin, request, url: { pathname } }) =>
      sameOrigin &&
      request.headers.get("RSC") === "1" &&
      isPublicRoute(pathname) &&
      !pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: "public-rsc",
      networkTimeoutSeconds: 4,
      plugins: [expiration(24, 24 * 60 * 60)],
    }),
  },
  // Any request not explicitly classified above stays online-only.
  {
    matcher: () => true,
    method: "GET",
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: PRECACHE_ENTRIES,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

serwist.addEventListeners();

/** Remove runtime caches from older BuildVision worker revisions. */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) &&
              !name.endsWith(`-${CACHE_VERSION}`)
          )
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Serwist handles this message and activates only after the user presses
// “Update now”; skipWaiting is deliberately false for safe, controlled UX.
