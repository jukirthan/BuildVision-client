"use client";

import { Download, Share, X } from "lucide-react";
import { useState } from "react";
import { usePWA } from "@/components/pwa/PWAProvider";

export default function PWAInstallPrompt() {
  const { canInstall, isIos, install, dismissInstall } = usePWA();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (!canInstall) return null;

  return (
    <aside
      className="fixed bottom-4 left-4 z-[80] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-4 shadow-lg"
      aria-label="Install BuildVision"
    >
      <button
        type="button"
        onClick={dismissInstall}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface hover:text-text-primary"
        aria-label="Dismiss install prompt"
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Download size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-primary">Install BuildVision</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Keep the planner one tap away with a focused app window.
          </p>
        </div>
      </div>

      {isIos ? (
        <>
          <button
            type="button"
            onClick={() => setShowIosSteps((open) => !open)}
            className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
            aria-expanded={showIosSteps}
          >
            <Share size={14} /> How to add on iPhone or iPad
          </button>
          {showIosSteps && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-text-secondary">
              <li>Open Safari’s Share menu.</li>
              <li>Choose “Add to Home Screen”.</li>
              <li>Tap “Add” to launch BuildVision standalone.</li>
            </ol>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          <Download size={14} /> Install App
        </button>
      )}
    </aside>
  );
}
