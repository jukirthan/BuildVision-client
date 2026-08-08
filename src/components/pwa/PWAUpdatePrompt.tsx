"use client";

import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { usePWA } from "@/components/pwa/PWAProvider";

export default function PWAUpdatePrompt() {
  const { isUpdateAvailable, updateNow } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpdateAvailable || dismissed) return null;

  return (
    <aside
      className="fixed bottom-4 right-4 z-[80] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-accent/20 bg-white p-4 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface hover:text-text-primary"
        aria-label="Dismiss update notification"
      >
        <X size={15} />
      </button>
      <p className="pr-7 text-sm font-semibold text-text-primary">New version available</p>
      <p className="mt-1 pr-5 text-xs leading-relaxed text-text-secondary">
        Update when your current edits are saved. The app will reload only after the new worker is active.
      </p>
      <button
        type="button"
        onClick={() => void updateNow()}
        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
      >
        <RefreshCw size={14} /> Update now
      </button>
    </aside>
  );
}
