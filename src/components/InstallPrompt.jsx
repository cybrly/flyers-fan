import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { getHostBrand } from '../host.js';

// Browsers fire `beforeinstallprompt` once when the app meets PWA install
// criteria. We capture the event, surface our own banner, and call
// `prompt()` on click. Dismissal is sticky for 30 days so we don't nag.

const DISMISS_KEY = 'flyersfan.install-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const InstallPrompt = () => {
  const [evt, setEvt] = useState(null);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    const onInstalled = () => setEvt(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!evt) return null;

  const install = async () => {
    try {
      evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === 'dismissed') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } catch { /* ignore */ }
    setEvt(null);
  };
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setEvt(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[320px] rounded-lg border border-white/[0.08] bg-[#0E0E0E]/95 backdrop-blur shadow-[0_18px_42px_-18px_rgba(0,0,0,0.9)] p-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-[#F74902]/[0.12] border border-[#F74902]/30 flex items-center justify-center flex-shrink-0">
        <Download size={16} className="text-[#FF8A4C]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-white/90">Install {getHostBrand().short}</div>
        <div className="text-[11px] font-mono text-white/45 mt-0.5">Add to home screen for fast offline launches.</div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={install}
            className="px-2.5 py-1 rounded bg-[#F74902] hover:bg-[#FF5C1F] text-black text-[11px] font-medium transition-colors"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="px-2.5 py-1 rounded text-white/45 hover:text-white/80 text-[11px] font-mono transition-colors"
          >
            not now
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
