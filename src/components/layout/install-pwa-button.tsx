"use client";

import React, { useEffect, useState } from "react";
import { Download, Laptop, Check, X, Smartphone, ArrowRight } from "lucide-react";

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone app mode
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      if (isStandaloneMode) {
        setIsStandalone(true);
        return;
      }

      // Check localStorage if previously installed
      try {
        if (localStorage.getItem("kaelixo_pwa_installed") === "true") {
          setIsInstalled(true);
        }
      } catch {}

      // 2. Register Service Worker for PWA compliance
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .catch(() => {
            // Silently fallback if service worker unsupported
          });
      }

      // 3. Listen for Chrome / Edge / Android native install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      // 4. Listen for successful install completion
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem("kaelixo_pwa_installed", "true");
        } catch {}
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  // If already installed or running as standalone software, HIDE the button completely!
  if (isStandalone || isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native browser install prompt (Chrome, Edge, Android, Opera)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        try {
          localStorage.setItem("kaelixo_pwa_installed", "true");
        } catch {}
      }
      setDeferredPrompt(null);
    } else {
      // Fallback: Show sleek quick-install guidance for Safari iOS / desktop
      setShowInstructionsModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install Kaelixo as standalone Desktop or Mobile App"
        className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 animate-in fade-in"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {/* Manual / Browser Fallback Install Guidance Modal */}
      {showInstructionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowInstructionsModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 text-neutral-900 dark:text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm">Install Kaelixo App</h3>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Use Kaelixo like full desktop and mobile software with native notifications and offline capabilities:
            </p>

            <div className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 flex items-start space-x-3">
                <Laptop className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold">On PC / Laptop (Chrome & Edge)</div>
                  <div className="text-[11px] text-neutral-500">
                    Click the <strong>Install</strong> icon in the right side of the URL address bar or browser menu (⋮) → &quot;Install Kaelixo&quot;.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 flex items-start space-x-3">
                <Smartphone className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold">On Mobile (Android & iPhone)</div>
                  <div className="text-[11px] text-neutral-500">
                    Tap the browser menu / Share icon → select <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong>.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
