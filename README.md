# BuildVision frontend

BuildVision is a Next.js 14 App Router frontend for the Flask structural-design API. The planner and landing page use React Three Fiber/Three.js, while the browser calls the backend through the same-origin `/api/*` rewrite configured in `next.config.mjs`.

## PWA architecture

- `src/app/manifest.ts` is the App Router metadata manifest. It defines standalone launch, public shortcuts, brand colours, any/maskable icons, and the landing-page screenshot.
- `src/app/sw.ts` is the Serwist service worker source. `@serwist/next` bundles it as `public/sw.js` during production builds. The generated worker is ignored by Git.
- `src/components/pwa/PWAProvider.tsx` registers the worker only in production and secure contexts, exposes install/update state, and renders the connection, install, and update UI.
- `src/app/offline/page.tsx` is the static offline fallback. It explains which actions are unavailable and links to public pages that may already be cached.
- Protected routes remain protected by the existing middleware and backend authorization. Service-worker caching never bypasses that flow.

## Installed PWA packages

- `@serwist/next` `9.5.12` — Next.js/webpack integration.
- `@serwist/cli` `9.5.12` — Serwist build peer dependency.
- `serwist` `9.5.12` — service-worker runtime, strategies, precaching, and expiration.

Serwist was selected because the project is on Next.js `14.2.35` and uses the webpack production build. Development registration is disabled and any worker left by a previous production run is unregistered by the client in development.

## Environment and commands

From `frontend/`:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run pwa:icons
npm run build
npm run start -- -p 3000
```

The frontend proxies `/api/*` to Flask. Set `API_PROXY_ORIGIN` to the backend origin without `/api` for Vercel/Railway deployments. `NEXT_PUBLIC_SITE_URL` is optional, but should be set to the public Vercel/custom-domain origin so Open Graph and Twitter images resolve to the deployed site.

The AI Assistant calls the authenticated `/api/ai/chat` endpoint. Configure
`OPENAI_API_KEY` and optionally `OPENAI_MODEL` on the Flask/Railway/AWS backend
only. Do not add the key to `NEXT_PUBLIC_*` variables or expose it in the
browser.

For a local production PWA check, run `npm run build` followed by `npm run start -- -p 3000`, then open `http://localhost:3000`. Service workers are intentionally not registered by `npm run dev`.

## Icons and screenshot replacement

The PWA icons are derived from the existing `public/buildvision.png` logo; no new brand mark was introduced. To replace them:

1. Replace `public/buildvision.png` with a square transparent logo.
2. Run `node scripts/generate-pwa-icons.mjs`.
3. Keep the generated files at `public/icons/buildvision-192.png`, `buildvision-192-maskable.png`, `buildvision-512.png`, and `buildvision-512-maskable.png`.
4. Replace `public/screenshots/buildvision-home.png` with a `1280x720` wide screenshot if the landing layout changes.

The favicon and Apple touch icon continue to use the existing files in `public/` and the existing `src/app/favicon.ico`.

## Cache strategy

The worker is deliberately allow-list based:

- Revisioned `/_next/static/*` assets: cache-first with bounded entries and a one-year maximum age.
- App icons, favicon, Apple touch icon, and manifest: cache-first with a 30-day limit.
- Local fonts: stale-while-revalidate with a 12-entry/30-day limit.
- Public images: stale-while-revalidate with a 48-entry/7-day limit. GLB/GLTF/BIN, video, and other large model/media requests are network-only.
- Public navigation and public RSC transitions: network-first with a four-second network timeout and bounded one-day caches.
- `/api/*`, authentication, protected routes/RSC, and every write method (`POST`, `PUT`, `PATCH`, `DELETE`) are network-only. JWTs, passwords, authenticated responses, projects, designs, admin data, and analysis results are not stored in public caches.
- Unclassified requests are network-only. This also gives external resources a safe network fallback rather than silently persisting opaque/private responses.

The cache namespace is derived from the generated precache manifest. On activation, old `buildvision-*` runtime caches are removed. Hashed Next assets and the revisioned offline/manifest entries prevent a stale frontend from being treated as a compatible backend client.

## Offline limitations

Offline mode is read-only and honest about server dependency. Previously visited public pages and public images may be available. Login, logout validation, project/building loading, profile changes, saving designs, syncing, AI recommendations, FEA/structural analysis, admin actions, and all backend writes require a connection. The app never queues or replays unsafe writes.

Local planner edits can remain visible in the current tab because the existing planner state is client-side, but they are not durable server saves. Reconnect before leaving the page or using a server-backed action.

## Architectural output window

The planner Export menu opens an output window with two coordinated drawings:

- **Detailed 2D technical plan**: modeled walls, openings, columns, stairs and dimensions, plus concept room zoning, electrical symbols, plumbing supply/waste lines, soil/drain routes and an inspection point.
- **Architectural exterior perspective**: a two-point perspective line drawing with left/right vanishing points, floor levels, facade openings, entry door and roof massing.

`src/types/architectural-output.ts` derives the presentation annotations from the active floor plate. Because the editor currently stores structural envelope geometry rather than a full BIM room/MEP graph, room and MEP annotations are explicitly marked concept-level in the output. They must be reviewed and replaced by licensed architectural, electrical and plumbing drawings before construction. Both preview tabs use `src/lib/architectural-svg.ts`, so SVG downloads and the output window cannot drift apart. The existing PNG/PDF/JSON exports remain available.

## Install and update behaviour

- Chromium browsers expose the install card only after `beforeinstallprompt` fires. The prompt is hidden in standalone mode and after a dismissal for 14 days.
- iOS Safari has no standard `beforeinstallprompt`; the card gives Share → Add to Home Screen instructions.
- A waiting worker produces a small “New version available” card. “Update now” sends `SKIP_WAITING`, waits for `controllerchange`, then reloads once. It never reloads automatically, so users can finish saves first.
- `updateViaCache: "none"` makes worker checks independent of stale HTTP cache headers.

## Testing checklist

After `npm run build` and `npm run start -- -p 3000`:

1. Open the site in Chrome desktop and inspect Application → Manifest. Confirm the name, standalone display, `/` scope, shortcuts, screenshot, and all four icon URLs.
2. Inspect Application → Service Workers. Confirm `/sw.js` is registered, has scope `/`, and controls the page.
3. Visit `/`, `/features`, and another public page, then enable Offline in DevTools and reload. Confirm cached public content or the branded `/offline` fallback appears.
4. With Offline enabled, verify login, project creation, planner save, profile save, admin endpoints, and analysis do not report success or create queued requests. Re-enable the network and confirm the connection-return notice.
5. In Chrome desktop/Android, install from the browser UI and verify standalone launch. On iOS Safari, use Share → Add to Home Screen and verify the standalone launch/status bar.
6. Make a frontend change, deploy/build a new worker, revisit the installed app, and confirm the update card appears. Click Update now only after a save is complete; confirm one reload and no reload loop.
7. Check logout, user switching, protected route redirects, responsive mobile layouts, slow-network behaviour, and the planner’s 3D canvas after installation.
8. Run Lighthouse on the production build for PWA, accessibility, performance, and best practices. Treat third-party/API availability separately from the frontend PWA score.

## Troubleshooting

- No install option: use HTTPS or `localhost`, confirm the manifest is valid, confirm 192/512 icons return `200 image/png`, and check that the browser is not already in standalone mode.
- Old layout after a deploy: Application → Service Workers → unregister, then Clear storage → Clear site data and reload. A normal update should remove old `buildvision-*` caches automatically after activation.
- Offline page not shown: verify `/offline` is reachable in an online production build and that `/sw.js` is controlling the page before switching DevTools to Offline.
- API errors: confirm `API_PROXY_ORIGIN` points to the Flask public origin without `/api`, and check the Railway/AWS service and CORS/proxy logs. API requests are intentionally not cached.
- Development appears stale: stop `next start`, run `npm run dev`, and reload. Development registration is disabled and the client attempts to unregister a worker at `/sw.js`.
- Build output: `public/sw.js` and its source map are generated artifacts. They are intentionally ignored; always regenerate them through `npm run build` before deployment.
