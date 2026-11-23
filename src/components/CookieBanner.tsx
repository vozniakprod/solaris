import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { LegalDocId } from '../data/legalDocuments';
import { syncTikTokConsent } from '../utils/tiktokPixel';

export const COOKIE_CONSENT_STORAGE_KEY = 'cookie_consent';

export interface CookieConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: string;
}

export function loadCookieConsent(): CookieConsentState | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      version: typeof parsed.version === 'string' ? parsed.version : '1.0',
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: { analytics: boolean; marketing: boolean }): CookieConsentState {
  const record: CookieConsentState = {
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    updatedAt: new Date().toISOString(),
    version: '1.0',
  };
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage quota errors
  }
  return record;
}

interface CookieBannerProps {
  forceOpenSettings: boolean;
  onCloseSettings: () => void;
  onOpenLegal: (doc: LegalDocId) => void;
}

export function CookieBanner({
  forceOpenSettings,
  onCloseSettings,
  onOpenLegal,
}: CookieBannerProps) {
  const [consent, setConsent] = useState<CookieConsentState | null>(() => loadCookieConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(false);
  const [marketingDraft, setMarketingDraft] = useState(false);

  useEffect(() => {
    if (forceOpenSettings) {
      setAnalyticsDraft(consent?.analytics ?? false);
      setMarketingDraft(consent?.marketing ?? false);
      setSettingsOpen(true);
    }
  }, [forceOpenSettings, consent]);

  useEffect(() => {
    if (consent) {
      syncTikTokConsent(consent.marketing);
    }
  }, [consent]);

  const handleAcceptAll = () => {
    const saved = saveCookieConsent({ analytics: true, marketing: true });
    syncTikTokConsent(true);
    setConsent(saved);
    setSettingsOpen(false);
    onCloseSettings();
  };

  const handleEssentialOnly = () => {
    const saved = saveCookieConsent({ analytics: false, marketing: false });
    syncTikTokConsent(false);
    setConsent(saved);
    setSettingsOpen(false);
    onCloseSettings();
  };

  const handleSaveCustom = () => {
    const saved = saveCookieConsent({
      analytics: analyticsDraft,
      marketing: marketingDraft,
    });
    syncTikTokConsent(saved.marketing);
    setConsent(saved);
    setSettingsOpen(false);
    onCloseSettings();
  };

  const handleCloseModal = () => {
    setSettingsOpen(false);
    onCloseSettings();
  };

  return (
    <>
      {/* First-visit Cookie Banner (clean compact light bar with equal-prominence actions) */}
      {!consent && !settingsOpen && (
        <aside
          role="dialog"
          aria-label="Zgoda na pliki cookies"
          className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white/98 p-4 text-[#111114] shadow-[0_14px_40px_rgba(17,17,20,0.12)] backdrop-blur-md sm:inset-x-6 sm:bottom-5 sm:p-5"
        >
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-zinc-600">
              <strong className="font-semibold text-[#111114]">Pliki cookies:</strong> Używamy
              niezbędnych cookies do działania Serwisu oraz — za Twoją zgodą — analitycznych i
              marketingowych. Szczegóły w{' '}
              <button
                type="button"
                onClick={() => onOpenLegal('cookies')}
                className="font-medium text-[#111114] underline decoration-zinc-300 underline-offset-2 hover:text-[#E84A27]"
              >
                Polityce cookies
              </button>{' '}
              i{' '}
              <button
                type="button"
                onClick={() => onOpenLegal('polityka')}
                className="font-medium text-[#111114] underline decoration-zinc-300 underline-offset-2 hover:text-[#E84A27]"
              >
                Polityce prywatności
              </button>
              .
            </p>

            {/* Equal-prominence buttons per EU/UODO guidance */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-900 bg-[#111114] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Akceptuję wszystkie
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-900 bg-[#111114] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Tylko niezbędne
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalyticsDraft(false);
                  setMarketingDraft(false);
                  setSettingsOpen(true);
                }}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-[#111114] transition-colors hover:bg-zinc-50"
              >
                Ustawienia
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Granular Cookie Preferences Dialog */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ustawienia plików cookies"
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-6"
          onClick={handleCloseModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white p-5 text-[#111114] shadow-2xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#111114]">
                  Ustawienia plików cookies
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Możesz dostosować zgody na cookies w każdej chwili.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Zamknij ustawienia cookies"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-[#FAFAFA] p-3.5">
                <div>
                  <p className="text-xs font-semibold text-[#111114]">Niezbędne (zawsze aktywne)</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                    Zapamiętanie formularza, identyfikator Raportu, bezpieczeństwo i zapis wyboru cookies.
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-medium text-emerald-700">
                  Aktywne
                </span>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-[#FAFAFA] p-3.5">
                <div>
                  <p className="text-xs font-semibold text-[#111114]">Analityczne</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                    Anonimowe statystyki odwiedzin i działania Serwisu.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsDraft}
                  onChange={(e) => setAnalyticsDraft(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-[#FAFAFA] p-3.5">
                <div>
                  <p className="text-xs font-semibold text-[#111114]">Marketingowe</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                    Pomiar skuteczności reklam (TikTok Pixel).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketingDraft}
                  onChange={(e) => setMarketingDraft(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#E84A27] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D43E1D]"
              >
                Zapisz wybór
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-zinc-900 bg-[#111114] px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Tylko niezbędne
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-zinc-900 bg-[#111114] px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Akceptuję wszystkie
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
