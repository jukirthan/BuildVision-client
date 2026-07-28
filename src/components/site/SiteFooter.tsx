"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Check, Globe } from "lucide-react";

/* lucide dropped brand glyphs — minimal inline marks instead. */
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
    <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.23l-4.88-6.38L6.5 22H3.35l7.24-8.28L2 2h6.39l4.41 5.83L18.9 2Zm-1.09 18.1h1.73L7.6 3.79H5.74L17.8 20.1Z" />
  </svg>
);
const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49l-.01-1.73c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9l-.01 2.81c0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
  </svg>
);
const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
  </svg>
);
const YouTubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
    <path d="M23.5 7.2a3.02 3.02 0 0 0-2.12-2.14C19.5 4.55 12 4.55 12 4.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 7.2 31.6 31.6 0 0 0 0 12c0 1.62.17 3.23.5 4.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14c.33-1.57.5-3.18.5-4.8 0-1.62-.17-3.23-.5-4.8ZM9.6 15.6V8.4l6.24 3.6-6.24 3.6Z" />
  </svg>
);

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/features#planner", label: "3D Planner" },
      { href: "/features#ai", label: "AI Assistant" },
      { href: "/features#camera", label: "Camera Measurement" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/#solutions", label: "Architecture" },
      { href: "/#solutions", label: "Civil Engineering" },
      { href: "/#solutions", label: "Construction" },
      { href: "/#solutions", label: "Real Estate" },
      { href: "/#solutions", label: "Education" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs", label: "API" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Community" },
      { href: "/contact", label: "Support" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "News" },
      { href: "/contact", label: "Contact" },
      { href: "/contact", label: "Careers" },
    ],
  },
];

const SOCIAL = [
  { icon: XIcon, label: "X (Twitter)", href: "https://twitter.com" },
  { icon: GitHubIcon, label: "GitHub", href: "https://github.com" },
  { icon: LinkedInIcon, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: YouTubeIcon, label: "YouTube", href: "https://youtube.com" },
];

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="bg-ink text-white/70">
      {/* Newsletter band */}
      <div className="border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-semibold tracking-tight text-white">
              Building intelligence, monthly.
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">
              Product updates, engineering notes and AI design techniques. No
              noise, unsubscribe anytime.
            </p>
          </div>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSubscribed(true);
            }}
          >
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              disabled={subscribed}
              className="h-11 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white outline-none backdrop-blur transition-colors placeholder:text-white/35 focus:border-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={subscribed}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:pointer-events-none"
            >
              {subscribed ? (
                <>
                  <Check size={15} /> Subscribed
                </>
              ) : (
                <>
                  Subscribe <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-display text-base font-semibold text-white"
            >
              <Image
                src="/buildvision.webp"
                alt="BuildVision"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-contain"
              />
              BuildVision
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
              The intelligent building design platform — 3D structural planning,
              AI assistance, quantities and site measurement in one workspace.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/55 transition-colors hover:border-white/25 hover:text-white"
                >
                  <s.icon />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} BuildVision. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <Globe size={13} /> English (EN)
            </span>
            <Link href="/contact" className="transition-colors hover:text-white/70">
              Privacy
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white/70">
              Terms
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white/70">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
