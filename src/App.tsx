import { useEffect, useState } from 'react';
import { Header, type AppView, type NavSectionId } from './components/Header';
import { Hero, type HeroQuickStartPayload } from './components/Hero';
import { LandingSections } from './components/LandingSections';
import { FORM_DRAFT_STORAGE_KEY, QuizFunnel } from './components/QuizFunnel';
import { CalculatingScreen } from './components/CalculatingScreen';
import { ReportDashboard, type UnlockState } from './components/ReportDashboard';
import { LegalModal } from './components/LegalModal';
import { CookieBanner } from './components/CookieBanner';
import { LEGAL_TEXTS, type LegalDocId } from './data/legalDocuments';
import type {
  PersonInput,
  QuizAnswers,
  SolarisFullReport,
} from './utils/ephemerisEngine';
import type { FunnelMode, RelationType } from './utils/solarisPricing';
import {
  parsePlnAmountToNumber,
  trackTikTokCompletePayment,
  trackTikTokSubmitForm,
  trackTikTokViewContent,
} from './utils/tiktokPixel';

const STORAGE_KEY = 'solaris_2027_session_v2';

interface PersistedSession {
  report: SolarisFullReport;
  unlockState: UnlockState;
  hasRetentionDiscount: boolean;
}

interface PendingPayload {
  mode: FunnelMode;
  relationType: RelationType | null;
  person1: PersonInput;
  person2: PersonInput | null;
  quizAnswers: QuizAnswers;
}

const INITIAL_UNLOCK: UnlockState = {
  paid: false,
  unlockedModules: [],
  calendarUnlocked: false,
  pdfUnlocked: false,
  orderId: null,
  lastStripeSessionId: null,
  customerEmail: null,
  emailDeliveredTo: null,
  firstPurchaseAtMs: null,
  confirmation: null,
};

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.report?.sessionId) return null;
    return {
      ...parsed,
      unlockState: {
        ...INITIAL_UNLOCK,
        ...(parsed.unlockState ?? {}),
      },
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [persisted, setPersisted] = useState<PersistedSession | null>(() =>
    loadPersistedSession(),
  );
  const [view, setView] = useState<AppView>('landing');
  const [activeNav, setActiveNav] = useState<NavSectionId>('start');
  const [selectedMode, setSelectedMode] = useState<FunnelMode>('solo');
  const [heroQuickStart, setHeroQuickStart] = useState<HeroQuickStartPayload | null>(null);
  const [pendingPayload, setPendingPayload] = useState<PendingPayload | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<{
    type: 'verifying' | 'success' | 'cancelled' | 'error';
    text: string;
  } | null>(null);

  // Server-authoritative session & Stripe return verification (strictly ignores `?paid=1`)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('raport')?.trim();
    const urlTryb = params.get('tryb')?.trim();
    const checkoutStatus = params.get('checkout')?.trim();
    const stripeSessionId = params.get('stripe_session_id')?.trim();

    if (!urlSessionId && urlTryb === 'para') {
      setSelectedMode('pair');
      setView('funnel');
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('tryb');
        window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}`);
      } catch {
        // ignore history errors
      }
      return;
    }

    const targetSessionId = urlSessionId || persisted?.report.sessionId;
    if (!targetSessionId) return;

    const cleanUrlParams = () => {
      try {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('checkout');
        nextUrl.searchParams.delete('stripe_session_id');
        nextUrl.searchParams.delete('paid');
        window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
      } catch {
        // ignore history API issues in sandboxed frames
      }
    };

    let cancelled = false;
    (async () => {
      if (checkoutStatus === 'cancelled') {
        setView('report');
        setPaymentNotice({
          type: 'cancelled',
          text: 'Płatność w Stripe została anulowana — nie pobraliśmy żadnych środków. Możesz dokończyć wybór modułów w dowolnym momencie.',
        });
        cleanUrlParams();
      }

      // 1. Fetch server-authoritative report state if still in server memory
      let serverReport: SolarisFullReport | null = null;
      let serverUnlock: UnlockState | null = null;
      try {
        const res = await fetch(`/api/report/${encodeURIComponent(targetSessionId)}`);
        if (res.ok && !cancelled) {
          const json = (await res.json()) as {
            report?: SolarisFullReport;
            unlockState?: UnlockState;
          };
          if (json.report) serverReport = json.report;
          if (json.unlockState) serverUnlock = { ...INITIAL_UNLOCK, ...json.unlockState };
        }
      } catch {
        // Keep local persisted state if server restarted
      }

      // 2. If returning from Stripe Checkout, verify payment_status === 'paid' directly on server
      if (checkoutStatus === 'success' && stripeSessionId && !cancelled) {
        setView('report');
        setPaymentNotice({
          type: 'verifying',
          text: 'Potwierdzamy status Twojej płatności w Stripe...',
        });
        try {
          const verifyRes = await fetch(
            `/api/checkout/verify?sessionId=${encodeURIComponent(targetSessionId)}&stripe_session_id=${encodeURIComponent(stripeSessionId)}`,
          );
          const verifyRaw = await verifyRes.text();
          let verifyJson: {
            ok?: boolean;
            verified?: boolean;
            unlockState?: UnlockState;
            report?: SolarisFullReport | null;
            error?: string;
          } = {};
          if (verifyRaw) {
            try {
              verifyJson = JSON.parse(verifyRaw);
            } catch {
              verifyJson = {};
            }
          }
          if (!cancelled) {
            if (verifyRes.ok && verifyJson.verified && verifyJson.unlockState) {
              serverUnlock = { ...INITIAL_UNLOCK, ...verifyJson.unlockState };
              if (verifyJson.report) {
                serverReport = verifyJson.report;
              }
              const reportForDelivery =
                serverReport ??
                (persisted?.report && persisted.report.sessionId === targetSessionId
                  ? persisted.report
                  : null);

              // Stateless Vercel cold-start: enrich paid modules + auto-deliver full report email in one round-trip
              if (reportForDelivery && (!verifyJson.report || !serverUnlock.emailDeliveredTo)) {
                try {
                  const deliverRes = await fetch('/api/report/deliver-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId: targetSessionId,
                      stripeSessionId,
                      report: reportForDelivery,
                    }),
                  });
                  if (deliverRes.ok) {
                    const deliverData = (await deliverRes.json()) as {
                      report?: SolarisFullReport;
                      deliveredTo?: string | null;
                      customerEmail?: string | null;
                    };
                    if (deliverData.report) serverReport = deliverData.report;
                    if (deliverData.deliveredTo || deliverData.customerEmail) {
                      serverUnlock = {
                        ...serverUnlock,
                        emailDeliveredTo: deliverData.deliveredTo ?? serverUnlock.emailDeliveredTo,
                        customerEmail: deliverData.customerEmail ?? serverUnlock.customerEmail,
                      };
                    }
                  }
                } catch {
                  // keep locally stored deterministic report if enrichment/email times out
                }
              }
              trackTikTokCompletePayment({
                eventId: stripeSessionId,
                contentId: serverUnlock.orderId || targetSessionId,
                contentName: serverUnlock.confirmation?.variantLabel
                  ? `Solaris 2027 — Raport (${serverUnlock.confirmation.variantLabel})`
                  : 'Solaris 2027 — Raport',
                value: parsePlnAmountToNumber(serverUnlock.confirmation?.priceGrossPln),
              });
              setPaymentNotice({
                type: 'success',
                text: serverUnlock.emailDeliveredTo
                  ? `Płatność potwierdzona przez Stripe. Wybrane moduły są już odblokowane, a pełny raport wysłaliśmy także na ${serverUnlock.emailDeliveredTo}.`
                  : 'Płatność potwierdzona przez Stripe. Wybrane moduły raportu Solaris 2027 są już odblokowane poniżej.',
              });
              cleanUrlParams();
            } else if (verifyRes.ok && verifyJson.verified === false) {
              setPaymentNotice({
                type: 'error',
                text: 'Płatność jest jeszcze przetwarzana przez operatora (np. BLIK/bank). Odśwież stronę za kilka sekund.',
              });
            } else {
              setPaymentNotice({
                type: 'error',
                text: verifyJson.error || LEGAL_TEXTS.paymentFailedError,
              });
            }
          }
        } catch {
          if (!cancelled) {
            setPaymentNotice({
              type: 'error',
              text: 'Nie udało się połączyć z serwerem w celu weryfikacji płatności Stripe. Odśwież stronę za chwilę.',
            });
          }
        }
      }

      if (cancelled) return;

      if (serverReport || serverUnlock) {
        setPersisted((prev) => {
          const activeReport = serverReport ?? prev?.report;
          if (!activeReport) return prev;
          return {
            report: activeReport,
            unlockState: serverUnlock ?? prev?.unlockState ?? INITIAL_UNLOCK,
            hasRetentionDiscount: prev?.hasRetentionDiscount ?? false,
          };
        });
        if (urlSessionId) {
          setView('report');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (persisted) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage quota errors
    }
  }, [persisted]);

  const handleSelectNav = (id: NavSectionId) => {
    setActiveNav(id);
    if (view !== 'landing') {
      setView('landing');
    }
    window.setTimeout(() => {
      if (id === 'start') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 30);
  };

  const handleStartFunnel = (mode?: FunnelMode) => {
    setHeroQuickStart(null);
    setSelectedMode(mode ?? 'solo');
    setView('funnel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickStartFromHero = (payload: HeroQuickStartPayload) => {
    setSelectedMode(payload.mode);
    setHeroQuickStart(payload);
    setView('funnel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const runTeaserCalculation = async (payload: PendingPayload) => {
    setPendingPayload(payload);
    setCalcError(null);
    setView('calculating');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const [response] = await Promise.all([
        fetch('/api/report/teaser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1100)),
      ]);

      window.clearTimeout(timeoutId);

      const rawText = await response.text();
      let json: {
        report?: SolarisFullReport;
        unlockState?: UnlockState;
        code?: string;
        error?: string;
      } = {};
      if (rawText) {
        try {
          json = JSON.parse(rawText);
        } catch {
          json = {};
        }
      }

      if (!response.ok || !json.report) {
        if (json.code === 'PLACE_NOT_FOUND') {
          setCalcError(json.error || LEGAL_TEXTS.cityNotFoundError);
        } else if (json.code === 'VALIDATION_ERROR' || json.code === 'RATE_LIMITED') {
          setCalcError(json.error || LEGAL_TEXTS.serverCalcError);
        } else {
          setCalcError(json.error || LEGAL_TEXTS.serverCalcError);
        }
        return;
      }

      setPersisted({
        report: json.report,
        unlockState: json.unlockState ? { ...INITIAL_UNLOCK, ...json.unlockState } : INITIAL_UNLOCK,
        hasRetentionDiscount: false,
      });
      setPaymentNotice(null);
      try {
        window.history.replaceState(
          {},
          '',
          `/?raport=${encodeURIComponent(json.report.sessionId)}`,
        );
      } catch {
        // ignore
      }
      trackTikTokViewContent({
        contentId: json.report.sessionId,
        contentName:
          json.report.mode === 'pair'
            ? 'Solaris 2027 — Raport Dla Dwojga'
            : 'Solaris 2027 — Raport Solo',
        value: json.report.mode === 'pair' ? 49.99 : 29.99,
      });
      setView('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      window.clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setCalcError(
          `Przekroczono czas oczekiwania na odpowiedź serwera. ${LEGAL_TEXTS.serverCalcError}`,
        );
      } else {
        setCalcError(LEGAL_TEXTS.serverCalcError);
      }
    }
  };

  const handleSaveFollowUpEmail = async (
    email: string,
    marketingConsent: boolean,
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const response = await fetch('/api/followup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          marketingConsent,
          sessionId: persisted?.report.sessionId ?? 'landing-visitor',
          personName: persisted?.report.person1.name,
          peakMonthPl: persisted?.report.peakMonthPl,
          riskMonthPl: persisted?.report.riskMonthPl,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !json.ok) {
        return {
          ok: false,
          message: json.error || 'Wpisz poprawny adres e-mail i zaznacz zgodę.',
        };
      }
      trackTikTokSubmitForm();
      return {
        ok: true,
        message:
          json.message ||
          'Zapisaliśmy Twój adres. Rabat -20% na pełny pakiet jest gotowy.',
      };
    } catch {
      return { ok: false, message: LEGAL_TEXTS.serverCalcError };
    }
  };

  const handleBackToLanding = () => {
    if (
      view === 'report' &&
      persisted &&
      persisted.unlockState.unlockedModules.length === 0 &&
      !persisted.hasRetentionDiscount
    ) {
      setPersisted({
        ...persisted,
        hasRetentionDiscount: true,
      });
    }
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const returningBanner =
    persisted && persisted.unlockState.unlockedModules.length === 0
      ? {
          personName: persisted.report.person1.name,
          riskMonthPl: persisted.report.riskMonthPl,
          onResume: () => {
            setView('report');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          },
        }
      : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111114]">
      <Header
        view={view}
        activeNav={activeNav}
        hasSavedReport={Boolean(persisted)}
        onSelectNav={handleSelectNav}
        onStartFunnel={() => handleStartFunnel(selectedMode)}
        onBackToLanding={handleBackToLanding}
        onOpenSavedReport={() => {
          if (persisted) {
            setView('report');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />

      {view === 'landing' && (
        <main>
          <Hero
            onStartFunnel={handleStartFunnel}
            onQuickStart={handleQuickStartFromHero}
            returningBanner={returningBanner}
          />
          <LandingSections
            onStartFunnel={handleStartFunnel}
            onOpenLegal={setLegalDoc}
            onOpenCookieSettings={() => setCookieSettingsOpen(true)}
            onSaveNewsletterEmail={handleSaveFollowUpEmail}
          />
        </main>
      )}

      {view === 'funnel' && (
        <QuizFunnel
          initialMode={selectedMode}
          initialBirthDate={heroQuickStart?.birthDate}
          initialPartnerBirthDate={heroQuickStart?.partnerBirthDate}
          skipModeStep={Boolean(heroQuickStart)}
          onCancel={() => {
            setHeroQuickStart(null);
            setView('landing');
          }}
          onOpenLegal={setLegalDoc}
          onSubmitComplete={runTeaserCalculation}
        />
      )}

      {view === 'calculating' && (
        <CalculatingScreen
          personName={pendingPayload?.person1.name || 'Ty'}
          isPair={pendingPayload?.mode === 'pair'}
          error={calcError}
          onRetry={() => {
            if (pendingPayload) runTeaserCalculation(pendingPayload);
          }}
          onBack={() => setView('funnel')}
        />
      )}

      {view === 'report' && persisted && (
        <ReportDashboard
          report={persisted.report}
          unlockState={persisted.unlockState}
          hasRetentionDiscount={persisted.hasRetentionDiscount}
          paymentNotice={paymentNotice}
          onDismissPaymentNotice={() => setPaymentNotice(null)}
          onUnlockSuccess={(nextUnlock, updatedReport) =>
            setPersisted((prev) =>
              prev
                ? {
                    ...prev,
                    report: updatedReport ?? prev.report,
                    unlockState: nextUnlock,
                  }
                : prev,
            )
          }
          onActivateRetentionDiscount={() =>
            setPersisted((prev) =>
              prev ? { ...prev, hasRetentionDiscount: true } : prev,
            )
          }
          onSaveFollowUpEmail={handleSaveFollowUpEmail}
          onOpenLegal={setLegalDoc}
          onStartFresh={() => {
            try {
              window.localStorage.removeItem(FORM_DRAFT_STORAGE_KEY);
              window.history.replaceState({}, '', '/');
            } catch {
              // ignore
            }
            setPaymentNotice(null);
            setPersisted(null);
            setView('funnel');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
      <CookieBanner
        forceOpenSettings={cookieSettingsOpen}
        onCloseSettings={() => setCookieSettingsOpen(false)}
        onOpenLegal={setLegalDoc}
      />
    </div>
  );
}
