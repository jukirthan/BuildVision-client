"use client";

import { CheckCircle2, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePWA } from "@/components/pwa/PWAProvider";

export default function ConnectionStatus() {
  const { isOnline } = usePWA();
  const wasOffline = useRef(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowReconnected(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowReconnected(true);
    const timer = window.setTimeout(() => setShowReconnected(false), 4000);
    return () => window.clearTimeout(timer);
  }, [isOnline]);

  if (isOnline && !showReconnected) return null;

  const onlineAgain = isOnline && showReconnected;
  return (
    <div
      className={`fixed inset-x-0 top-0 z-[90] flex items-center justify-center px-4 pb-2 pt-safe text-xs font-medium shadow-sm ${
        onlineAgain ? "bg-success text-white" : "bg-ink text-white"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full px-3 py-1.5">
        {onlineAgain ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
        <span>
          {onlineAgain
            ? "Back online. Server actions are available again."
            : "You’re offline. Login, saving, syncing, and analysis need a connection."}
        </span>
      </div>
    </div>
  );
}
