"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ConnectionStatus from "@/components/pwa/ConnectionStatus";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/pwa/PWAUpdatePrompt";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PWAContextValue = {
  isOnline: boolean;
  isIos: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  isUpdateAvailable: boolean;
  install: () => Promise<void>;
  dismissInstall: () => void;
  updateNow: () => Promise<void>;
};

const INSTALL_DISMISSED_KEY = "buildvision:pwa-install-dismissed";
const UPDATE_RELOAD_KEY = "buildvision:pwa-update-reload";
const DISMISSAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const PWAContext = createContext<PWAContextValue | null>(null);

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean(navigator.standalone))
  );
}

function isIosDevice() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isServiceWorkerContextAllowed() {
  const localHost = /^(localhost|127\.0\.0\.1|::1)$/.test(
    window.location.hostname
  );
  return window.isSecureContext || localHost;
}

export default function PWAProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateInProgressRef = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setIsIos(isIosDevice());
    setIsInstalled(isStandaloneMode());

    const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY));
    if (dismissedAt && Date.now() - dismissedAt < DISMISSAL_WINDOW_MS) {
      setInstallDismissed(true);
    } else if (dismissedAt) {
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
    }

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // Remove a worker left by a previous `next start` run so development
      // never serves stale production assets or intercepts HMR/API traffic.
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations
            .filter((registration) =>
              registration.active?.scriptURL.endsWith("/sw.js")
            )
            .forEach((registration) => void registration.unregister());
        });
      }
      return;
    }

    if (!("serviceWorker" in navigator) || !isServiceWorkerContextAllowed()) {
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;

    const markWaitingWorker = () => {
      if (!disposed && registration?.waiting) setIsUpdateAvailable(true);
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((nextRegistration) => {
        if (disposed) return;
        registration = nextRegistration;
        registrationRef.current = nextRegistration;
        markWaitingWorker();

        registration.addEventListener("updatefound", () => {
          const installing = registration?.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              markWaitingWorker();
            }
          });
        });

        void registration.update();
      })
      .catch(() => {
        // Registration is an enhancement. The site remains usable without it.
      });

    return () => {
      disposed = true;
      registrationRef.current = null;
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    } else {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
      setInstallDismissed(true);
    }
  }, [installPrompt]);

  const dismissInstall = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setInstallDismissed(true);
    setInstallPrompt(null);
  }, []);

  const updateNow = useCallback(async () => {
    if (updateInProgressRef.current) return;
    updateInProgressRef.current = true;

    const registration =
      registrationRef.current || (await navigator.serviceWorker.getRegistration("/"));
    const waiting = registration?.waiting;
    if (!waiting) {
      setIsUpdateAvailable(false);
      updateInProgressRef.current = false;
      return;
    }

    const updateMarker = waiting.scriptURL;
    if (sessionStorage.getItem(UPDATE_RELOAD_KEY) === updateMarker) {
      updateInProgressRef.current = false;
      return;
    }
    sessionStorage.setItem(UPDATE_RELOAD_KEY, updateMarker);

    const activated = new Promise<boolean>((resolve) => {
      let settled = false;
      const onControllerChange = () => finish(true);
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
        resolve(value);
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );
      window.setTimeout(() => finish(false), 12000);
    });

    waiting.postMessage({ type: "SKIP_WAITING" });
    if (await activated) {
      // The marker prevents duplicate clicks during this activation window;
      // clear it before the reload so a later deployment in the same tab can
      // still present and activate its own update.
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);
      window.location.reload();
    } else {
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);
      setIsUpdateAvailable(true);
      updateInProgressRef.current = false;
    }
  }, []);

  const canInstall =
    !isInstalled && !installDismissed && Boolean(installPrompt || isIos);
  const value = useMemo<PWAContextValue>(
    () => ({
      isOnline,
      isIos,
      isInstalled,
      canInstall,
      isUpdateAvailable,
      install,
      dismissInstall,
      updateNow,
    }),
    [
      canInstall,
      dismissInstall,
      install,
      isInstalled,
      isIos,
      isOnline,
      isUpdateAvailable,
      updateNow,
    ]
  );

  return (
    <PWAContext.Provider value={value}>
      {children}
      <ConnectionStatus />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) throw new Error("usePWA must be used inside PWAProvider");
  return context;
}
