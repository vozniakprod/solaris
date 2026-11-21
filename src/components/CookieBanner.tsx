import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { LegalDocId } from '../data/legalDocuments';

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

  const handleAcceptAll = () => {
    const saved = saveCookieConsent({ analytics: true, marketing: true });
    setConsent(saved);
    setSettingsOpen(false);
    onCloseSettings();
  };

  const handleEssentialOnly = () => {
    const saved = saveCookieConsent({ analytics: false, marketing: false });
    setConsent(saved);
    setSettingsOpen(false);
    onCloseSettings();
  };

  const handleSaveCustom = () => {
    const saved = saveCookieConsent({
      analytics: analyticsDraft,
      marketing: marketingDraft,
    });
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
      {/* First-visit Cookie Banner (equal size & prominence for all 3 actions) */}
      {!consent && !settingsOpen && (
        <aside
          role="dialog"
          aria-label="Zgoda na pliki cookies"
          className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-[22px] border border-white/[0.14] bg-[#141418]/98 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:inset-x-6 sm:bottom-5 sm:p-5"
        >
          <div className="space-y-3">
            <h2 className="font-display text-base font-semibold text-white">
              Cenimy Twoją prywatność
            </h2>
            <p className="text-xs leading-relaxed text-[#C4C4CE]">
              Używamy plików cookies niezbędnych do działania Serwisu. Za Twoją zgodą korzystamy też z
              cookies analitycznych i marketingowych (m.in. do pomiaru skuteczności reklam). Możesz
              zmienić wybór w każdej chwili. Szczegóły w{' '}
              <button
                type="button"
                onClick={() => onOpenLegal('cookies')}
                className="underline decoration-white/40 underline-offset-2 hover:text-white"
              >
                Polityce cookies
              </button>{' '}
              i{' '}
              <button
                type="button"
                onClick={() => onOpenLegal('polityka')}
                className="underline decoration-white/40 underline-offset-2 hover:text-white"
              >
                Polityce prywatności
              </button>
              .
            </p>

            {/* Equal-prominence buttons per EU/UODO guidance */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold text-[#111114] transition-opacity hover:opacity-90"
              >
                Akceptuję wszystkie
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold text-[#111114] transition-opacity hover:opacity-90"
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
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/25 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.15]"
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
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={handleCloseModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] border border-white/[0.12] bg-[#141418] p-5 text-white sm:rounded-[26px] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Ustawienia plików cookies
                </h2>
                <p className="mt-1 text-xs text-[#9A9AA3]">
                  Analityczne i marketingowe skrypty nie są ładowane bez Twojej zgody.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Zamknij ustawienia cookies"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white hover:bg-white/[0.12]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5">
                <div>
                  <p className="text-xs font-semibold text-white">Niezbędne (zawsze aktywne)</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9A9AA3]">
                    Zapamiętanie formularza, identyfikator Raportu, bezpieczeństwo i zapis wyboru cookies.
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-[#4ADE80]">Aktywne</span>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5">
                <div>
                  <p className="text-xs font-semibold text-white">Analityczne</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9A9AA3]">
                    Anonimowe statystyki odwiedzin i działania Serwisu.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsDraft}
                  onChange={(e) => setAnalyticsDraft(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5">
                <div>
                  <p className="text-xs font-semibold text-white">Marketingowe</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9A9AA3]">
                    Pomiar skuteczności reklam (np. TikTok Pixel, Meta Pixel).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketingDraft}
                  onChange={(e) => setMarketingDraft(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#FF5C35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF6E4B]"
              >
                Zapisz wybór
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold text-[#111114] hover:opacity-90"
              >
                Tylko niezbędne
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold text-[#111114] hover:opacity-90"
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
