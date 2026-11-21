import { useEffect, useState } from 'react';
import { Header, type AppView, type NavSectionId } from './components/Header';
import { Hero } from './components/Hero';
import { LandingSections } from './components/LandingSections';
import { QuizFunnel } from './components/QuizFunnel';
import { CalculatingScreen } from './components/CalculatingScreen';
import { ReportDashboard, type UnlockState } from './components/ReportDashboard';
import { LegalModal } from './components/LegalModal';
import type {
  PersonInput,
  QuizAnswers,
  SolarisFullReport,
} from './utils/ephemerisEngine';
import type { FunnelMode, RelationType } from './utils/solarisPricing';

const STORAGE_KEY = 'solaris_2027_session_v1';

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
  unlockedModules: [],
  calendarUnlocked: false,
  pdfUnlocked: false,
  orderId: null,
  firstPurchaseAtMs: null,
};

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.report?.sessionId) return null;
    return parsed;
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
  const [legalDoc, setLegalDoc] = useState<'regulamin' | 'polityka' | null>(null);

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

  const handleStartFunnel = (mode: FunnelMode) => {
    setSelectedMode(mode);
    setView('funnel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const runTeaserCalculation = async (payload: PendingPayload) => {
    setPendingPayload(payload);
    setCalcError(null);
    setView('calculating');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const [response] = await Promise.all([
        fetch('/api/report/teaser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1300)),
      ]);

      const json = (await response.json()) as {
        report?: SolarisFullReport;
        error?: string;
      };

      if (!response.ok || !json.report) {
        setCalcError(json.error || 'Nie udało się wygenerować raportu.');
        return;
      }

      setPersisted({
        report: json.report,
        unlockState: INITIAL_UNLOCK,
        hasRetentionDiscount: false,
      });
      setView('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setCalcError('Błąd połączenia z serwerem obliczeniowym. Spróbuj ponownie.');
    }
  };

  const handleSaveFollowUpEmail = async (
    email: string,
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const response = await fetch('/api/followup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          sessionId: persisted?.report.sessionId ?? 'landing-visitor',
        }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !json.ok) {
        return {
          ok: false,
          message: json.error || 'Wpisz poprawny adres e-mail.',
        };
      }
      return {
        ok: true,
        message:
          json.message ||
          'Zapisaliśmy Twój adres. Rabat -20% na pełny pakiet jest gotowy.',
      };
    } catch {
      return { ok: false, message: 'Błąd połączenia. Spróbuj ponownie.' };
    }
  };

  const handleBackToLanding = () => {
    // If leaving an unpaid report, gently activate returning non-buyer recovery (-20%)
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
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onStartFunnel={handleStartFunnel}
            returningBanner={returningBanner}
          />
          <LandingSections
            onStartFunnel={handleStartFunnel}
            onOpenLegal={setLegalDoc}
            onSaveNewsletterEmail={handleSaveFollowUpEmail}
          />
        </main>
      )}

      {view === 'funnel' && (
        <QuizFunnel
          initialMode={selectedMode}
          onCancel={() => setView('landing')}
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
            setPersisted(null);
            setView('funnel');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
}
