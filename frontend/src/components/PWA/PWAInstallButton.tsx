import { Download, Smartphone, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import type { TranslationStrings } from '../../i18n/translations';

interface PWAInstallButtonProps {
  t: TranslationStrings;
}

export function PWAInstallButton({ t }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const iosDialogRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap({
    isActive: showIOSGuide,
    containerRef: iosDialogRef,
    onClose: () => setShowIOSGuide(false),
  });

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[34px]"
      >
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden md:inline">{t.pwa.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-[#181818] text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap shrink-0 min-h-[34px]"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden md:inline">{t.pwa.installIos}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              ref={iosDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              tabIndex={-1}
              className="w-full max-w-sm rounded-xl border border-neutral-800 bg-[#141414] p-5 space-y-3.5 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 id="ios-install-title" className="text-sm font-semibold text-white">
                  {t.pwa.iosTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={t.pwa.iosClose}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-neutral-300 list-decimal ps-4 leading-relaxed">
                {t.pwa.iosSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-semibold hover:bg-white transition-colors"
              >
                {t.pwa.iosClose}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
