import { useEffect, useState } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (standaloneCheck) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user already dismissed it this session
    if (sessionStorage.getItem('cyclecare_pwa_dismissed')) {
      return;
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|crmo/.test(ua);
    if (isIosDevice && isSafari) {
      setIsIos(true);
      setShowPrompt(true);
      return;
    }

    // 4. Listen for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
    } catch {
      // User cancelled or prompt error
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('cyclecare_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-slide-up"
    >
      <div className="bg-brand-navy text-white rounded-2xl p-4 shadow-2xl border border-brand-amber/30 flex items-center justify-between gap-3 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-amber to-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <svg
              className="w-6 h-6 text-brand-navy"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm tracking-wide text-white truncate">
              CycleCare Mobile App
            </p>
            <p className="text-xs text-brand-sky truncate">
              {isIos
                ? 'Tap Share ⎋ & "Add to Home Screen"'
                : 'Install for 1-tap quick access'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isIos && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-amber hover:bg-amber-400 text-brand-navy transition-all shadow hover:shadow-md cursor-pointer active:scale-95"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
