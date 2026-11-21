import { useEffect, useState } from 'react';
import { Header, type AppView, type NavSectionId } from './components/Header';
import { Hero } from './components/Hero';
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
  const [pendingPayload, setPendingPayload] = useState<PendingPayload | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

  // Server-authoritative session sync on load; strictly ignores `?paid=1` query params (P0.6)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('raport')?.trim();
    const targetSessionId = urlSessionId || persisted?.report.sessionId;
    if (!targetSessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/report/${encodeURIComponent(targetSessionId)}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          report?: SolarisFullReport;
          unlockState?: UnlockState;
        };
        if (!json.report || !json.unlockState || cancelled) return;

        setPersisted((prev) => ({
          report: json.report!,
          // Always trust server unlockState rather than client URL flags (?paid=1 is ignored!)
          unlockState: {
            ...INITIAL_UNLOCK,
            ...json.unlockState!,
          },
          hasRetentionDiscount: prev?.hasRetentionDiscount ?? false,
        }));
        if (urlSessionId) {
          setView('report');
        }
      } catch {
        // Keep local persisted state if server restarted
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
    setSelectedMode(mode ?? 'solo');
    setView('funnel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const runTeaserCalculation = async (payload: PendingPayload) => {
    setPendingPayload(payload);
    setCalcError(null);
    setView('calculating');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

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

      const json = (await response.json()) as {
        report?: SolarisFullReport;
        unlockState?: UnlockState;
        code?: string;
        error?: string;
      };

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
        }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !json.ok) {
        return {
          ok: false,
          message: json.error || 'Wpisz poprawny adres e-mail i zaznacz zgodę.',
        };
      }
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
    <div className="min-h-screen bg-[#0B0B0D] text-white">
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
          onCancel={() => setView('landing')}
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
          onUnlockSuccess={(nextUnlock) =>
            setPersisted((prev) =>
              prev ? { ...prev, unlockState: nextUnlock } : prev,
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
            } catch {
              // ignore
            }
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
