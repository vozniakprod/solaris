import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Download,
  Lock,
  Printer,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import type { SolarisFullReport } from '../utils/ephemerisEngine';
import {
  calculateModularPricing,
  getAvailableModulesForMode,
  POST_PURCHASE_UPSELL_GROSZE,
  formatPlnFromGrosze,
  type ReportModuleId,
} from '../utils/solarisPricing';
import { triggerIcsDownload } from '../utils/icsExport';

export interface UnlockState {
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  pdfUnlocked: boolean;
  orderId: string | null;
  firstPurchaseAtMs: number | null;
}

interface ReportDashboardProps {
  report: SolarisFullReport;
  unlockState: UnlockState;
  hasRetentionDiscount: boolean;
  onUnlockSuccess: (next: UnlockState) => void;
  onActivateRetentionDiscount: () => void;
  onSaveFollowUpEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
  onOpenLegal: (doc: 'regulamin' | 'polityka') => void;
  onStartFresh: () => void;
}

function formatTimer(secondsLeft: number): string {
  const safe = Math.max(0, secondsLeft);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function ReportDashboard({
  report,
  unlockState,
  hasRetentionDiscount,
  onUnlockSuccess,
  onActivateRetentionDiscount,
  onSaveFollowUpEmail,
  onOpenLegal,
  onStartFresh,
}: ReportDashboardProps) {
  const availableModules = useMemo(
    () => getAvailableModulesForMode(report.mode),
    [report.mode],
  );

  const lockedModules = availableModules.filter(
    (m) => !unlockState.unlockedModules.includes(m.id),
  );
  const allUnlocked = lockedModules.length === 0;
  const hasAnyPurchase = unlockState.unlockedModules.length > 0;

  // Default pre-selection: Zgodność in pair mode, Finanse in solo mode
  const [selectedModules, setSelectedModules] = useState<ReportModuleId[]>(() =>
    report.mode === 'pair' ? ['zgodnosc', 'finanse'] : ['finanse'],
  );
  const [includeCalendarBump, setIncludeCalendarBump] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Interactive monthly timeline focus
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    const peak = report.monthlyTimeline.reduce(
      (best, curr) => (curr.energy > best.energy ? curr : best),
      report.monthlyTimeline[0],
    );
    return peak.monthIndex;
  });

  // Non-buyer retention ("Дожим") state
  const [showExitRescueModal, setShowExitRescueModal] = useState(false);
  const [useDownsellOffer, setUseDownsellOffer] = useState(false);
  const [downsellSecondsLeft, setDownsellSecondsLeft] = useState(600); // 10 min
  const [rescueEmail, setRescueEmail] = useState('');
  const [rescueStatus, setRescueStatus] = useState<{
    type: 'idle' | 'ok' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });

  // Post-purchase 15-minute upsell timer
  const [upsellSecondsLeft, setUpsellSecondsLeft] = useState(900);
  const [upsellWaiver, setUpsellWaiver] = useState(false);
  const [upsellError, setUpsellError] = useState<string | null>(null);

  useEffect(() => {
    if (!showExitRescueModal && !useDownsellOffer) return;
    const id = window.setInterval(() => {
      setDownsellSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [showExitRescueModal, useDownsellOffer]);

  useEffect(() => {
    if (!unlockState.firstPurchaseAtMs || allUnlocked) return;
    const updateRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - unlockState.firstPurchaseAtMs!) / 1000);
      setUpsellSecondsLeft(Math.max(0, 900 - elapsedSec));
    };
    updateRemaining();
    const id = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(id);
  }, [unlockState.firstPurchaseAtMs, allUnlocked]);

  const pricing = useMemo(
    () =>
      calculateModularPricing({
        mode: report.mode,
        selectedModules,
        includeCalendarBump,
        hasRetentionDiscount,
        useDownsellOffer: useDownsellOffer && downsellSecondsLeft > 0,
      }),
    [
      report.mode,
      selectedModules,
      includeCalendarBump,
      hasRetentionDiscount,
      useDownsellOffer,
      downsellSecondsLeft,
    ],
  );

  const toggleModule = (id: ReportModuleId) => {
    setCheckoutError(null);
    setUseDownsellOffer(false);
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectFullBundle = () => {
    setCheckoutError(null);
    setUseDownsellOffer(false);
    setSelectedModules(availableModules.map((m) => m.id));
  };

  const handleCheckout = async () => {
    if (selectedModules.length === 0) {
      setCheckoutError('Zaznacz co najmniej jeden moduł, aby przejść do płatności.');
      return;
    }
    if (!waiverAccepted) {
      setCheckoutError(
        'Zaznacz obowiązkową zgodę na dostarczenie treści cyfrowych przed upływem terminu odstąpienia.',
      );
      return;
    }

    setCheckoutError(null);
    setIsPaying(true);
    try {
      const response = await fetch('/api/report/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: report.sessionId,
          mode: report.mode,
          selectedModules,
          includeCalendarBump,
          hasRetentionDiscount,
          useDownsellOffer: useDownsellOffer && downsellSecondsLeft > 0,
          withdrawalWaiverAccepted: true,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        orderId?: string;
        unlockedModules?: ReportModuleId[];
        calendarUnlocked?: boolean;
        pdfUnlocked?: boolean;
      };

      if (!response.ok || !json.ok) {
        setCheckoutError(json.error || 'Nie udało się sfinalizować płatności. Spróbuj ponownie.');
        return;
      }

      const merged = Array.from(
        new Set([...unlockState.unlockedModules, ...(json.unlockedModules ?? selectedModules)]),
      );

      onUnlockSuccess({
        unlockedModules: merged,
        calendarUnlocked: unlockState.calendarUnlocked || Boolean(json.calendarUnlocked),
        pdfUnlocked: unlockState.pdfUnlocked || Boolean(json.pdfUnlocked),
        orderId: json.orderId ?? unlockState.orderId,
        firstPurchaseAtMs: unlockState.firstPurchaseAtMs ?? Date.now(),
      });
      setWaiverAccepted(false);
      setUseDownsellOffer(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setCheckoutError('Błąd połączenia z serwerem płatności. Spróbuj ponownie.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleUpsellRemaining = async () => {
    if (!upsellWaiver) {
      setUpsellError('Zaznacz zgodę na natychmiastowe dostarczenie treści cyfrowych.');
      return;
    }
    setUpsellError(null);
    setIsPaying(true);
    try {
      const remainingIds = lockedModules.map((m) => m.id);
      const response = await fetch('/api/report/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: report.sessionId,
          mode: report.mode,
          selectedModules: availableModules.map((m) => m.id),
          includeCalendarBump: true,
          withdrawalWaiverAccepted: true,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string; orderId?: string };
      if (!response.ok || !json.ok) {
        setUpsellError(json.error || 'Nie udało się odblokować pozostałych modułów.');
        return;
      }

      onUnlockSuccess({
        unlockedModules: Array.from(new Set([...unlockState.unlockedModules, ...remainingIds])),
        calendarUnlocked: true,
        pdfUnlocked: true,
        orderId: json.orderId ?? unlockState.orderId,
        firstPurchaseAtMs: unlockState.firstPurchaseAtMs,
      });
    } catch {
      setUpsellError('Błąd połączenia. Spróbuj ponownie.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleActivateDownsell = () => {
    const priorityMod: ReportModuleId = report.mode === 'pair' ? 'zgodnosc' : 'finanse';
    setSelectedModules([priorityMod]);
    setIncludeCalendarBump(false);
    setUseDownsellOffer(true);
    setShowExitRescueModal(false);
    document.getElementById('modular-paywall')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRescueEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onSaveFollowUpEmail(rescueEmail);
    setRescueStatus({ type: res.ok ? 'ok' : 'error', text: res.message });
    if (res.ok) {
      onActivateRetentionDiscount();
      setRescueEmail('');
    }
  };

  const activeMonth = report.monthlyTimeline[selectedMonthIdx] ?? report.monthlyTimeline[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      {/* POST-PURCHASE 15-MINUTE UPSELL BANNER (Partial buyers only) */}
      {hasAnyPurchase && !allUnlocked && upsellSecondsLeft > 0 && (
        <section
          aria-label="Oferta specjalna po zakupie"
          className="no-print mb-6 rounded-[22px] border border-[#FF5C35]/50 bg-[#1B1312] p-4 sm:p-5"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold tabular-nums text-[#FF7B5A]">
                OFERTA JEDNORAZOWA · WYGASA ZA {formatTimer(upsellSecondsLeft)}
              </p>
              <h2 className="font-display text-lg font-semibold text-white">
                Odblokuj wszystkie pozostałe moduły ({lockedModules.length}) + Kalendarz .ics i PDF A4 za{' '}
                {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
              </h2>
              <p className="text-xs text-[#C4C4CE]">
                Zamiast dopłacać osobno za każdą sferę, uzupełnij cały raport 2027 jednym kliknięciem.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 md:items-end">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#D4D4DC]">
                <input
                  type="checkbox"
                  checked={upsellWaiver}
                  onChange={(e) => {
                    setUpsellWaiver(e.target.checked);
                    if (upsellError) setUpsellError(null);
                  }}
                  className="h-4 w-4 accent-[#FF5C35]"
                />
                <span>Akceptuję natychmiastowe dostarczenie (art. 38 ust. 1 pkt 13)</span>
              </label>
              <button
                type="button"
                disabled={isPaying}
                onClick={handleUpsellRemaining}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#FF5C35] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#FF6E4B] disabled:opacity-50"
              >
                Kupuję i płacę — {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
              </button>
              {upsellError && (
                <p role="alert" className="text-xs text-[#FF8566]">
                  {upsellError}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TOP EPHEMERIS SUMMARY HEADER (Free Layer + Unlocked Artifacts Bar) */}
      <section className="print-card rounded-[26px] border border-white/[0.09] bg-[#121215] p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-xs tabular-nums text-[#D8B4FE]">
              Solariusz 2027 · {report.ephemeris.solarReturnDisplayPl} · {report.ephemeris.cityResolved}
            </p>
            <h1 className="font-display mt-2 text-2xl font-medium leading-tight text-white sm:text-3xl">
              {report.freeCoreVectorTitle}
            </h1>
            <p className="print-muted mt-2.5 max-w-2xl text-sm leading-relaxed text-[#C4C4CE]">
              {report.freeCoreVectorBody}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 no-print">
            {unlockState.calendarUnlocked && (
              <button
                type="button"
                onClick={() => triggerIcsDownload(report.person1.name, report.calendarEvents)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[#E9D5FF] px-4 py-2 text-xs font-semibold text-[#111114] transition-opacity hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kalendarz .ics (12 dat)</span>
              </button>
            )}
            {unlockState.pdfUnlocked && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white/35"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Drukuj / PDF A4</span>
              </button>
            )}
          </div>
        </div>

        {/* Astronomical Ephemeris Facts Strip */}
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="print-muted text-[11px] text-[#7D7D87]">Słońce natalne</dt>
            <dd className="mt-0.5 font-mono text-sm font-medium tabular-nums text-white">
              {report.ephemeris.natalSunDeg}° {report.ephemeris.natalSunSignPl}
            </dd>
          </div>
          <div>
            <dt className="print-muted text-[11px] text-[#7D7D87]">Jowisz / Saturn 2027</dt>
            <dd className="mt-0.5 text-sm font-medium text-white">
              {report.ephemeris.jupiterSignPl} · {report.ephemeris.saturnSignPl}
            </dd>
          </div>
          <div>
            <dt className="print-muted text-[11px] text-[#7D7D87]">Miesiąc wzrostu</dt>
            <dd className="mt-0.5 text-sm font-medium text-[#4ADE80]">{report.peakMonthPl}</dd>
          </div>
          <div>
            <dt className="print-muted text-[11px] text-[#7D7D87]">Miesiąc tarcia</dt>
            <dd className="mt-0.5 text-sm font-medium text-[#FF7B5A]">{report.riskMonthPl}</dd>
          </div>
        </dl>
      </section>

      {/* FREE OPEN INSIGHTS GRID (Compatibility Score if Pair + 1 Open Insight Card) */}
      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {report.mode === 'pair' && report.compatibilityScore !== null && (
          <article className="print-card rounded-[24px] bg-[#E9D5FF] p-5 text-[#111114] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#4C1D95]">
                  Bezpłatny wynik zgodności 2027
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold text-[#111114]">
                  {report.compatibilityHeadline}
                </h2>
              </div>
              <span className="font-mono shrink-0 rounded-full bg-[#111114] px-3 py-1 text-base font-bold tabular-nums text-white">
                {report.compatibilityScore}%
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#2F2440]">
              {report.compatibilityFreeInsight}
            </p>
          </article>
        )}

        <article
          className={`print-card rounded-[24px] bg-[#F5F3EC] p-5 text-[#111114] sm:p-6 ${
            report.mode === 'solo' ? 'md:col-span-2' : ''
          }`}
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B6B73]">
            Otwarta analiza na start (0 zł)
          </p>
          <h2 className="font-display mt-1 text-xl font-semibold text-[#111114]">
            {report.freeOpenInsightTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#383631]">
            {report.freeOpenInsightBody}
          </p>
        </article>
      </section>

      {/* INTERACTIVE 12-MONTH TIMELINE (Jan–Dec 2027) */}
      <section className="print-card mt-5 rounded-[26px] border border-white/[0.09] bg-[#121215] p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
              Oś energii i ryzyka: Styczeń – Grudzień 2027
            </h2>
            <p className="print-muted mt-1 text-xs text-[#8E8E98]">
              Kliknij wybrany miesiąc, aby zobaczyć rozkład napięcia i okna działania.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#9A9AA3]">
            <span>Biały: Energia</span>
            <span className="text-[#FF7B5A]">Koralowy: Ryzyko</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-12">
          {report.monthlyTimeline.map((pt) => {
            const isSelected = pt.monthIndex === selectedMonthIdx;
            return (
              <button
                key={pt.monthShort}
                type="button"
                onClick={() => setSelectedMonthIdx(pt.monthIndex)}
                aria-pressed={isSelected}
                className={`flex flex-col items-center rounded-xl border p-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] ${
                  isSelected
                    ? 'border-white/30 bg-white/[0.09]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'
                }`}
              >
                <div className="flex h-20 w-full items-end justify-center gap-1">
                  <span
                    style={{ height: `${pt.energy}%` }}
                    className="w-2 rounded-t-sm bg-white/90"
                  />
                  <span
                    style={{ height: `${pt.risk}%` }}
                    className="w-2 rounded-t-sm bg-[#FF5C35]/85"
                  />
                </div>
                <span className="mt-2 font-mono text-[10px] font-medium text-[#D4D4DC]">
                  {pt.monthShort}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#17171C] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-white">
              {activeMonth.monthFull}: {activeMonth.headline}
            </h3>
            <span className="font-mono text-xs tabular-nums text-[#C4C4CE]">
              Energia {activeMonth.energy}% · Ryzyko {activeMonth.risk}%
            </span>
          </div>
          {hasAnyPurchase ? (
            <p className="mt-2 text-sm leading-relaxed text-[#D4D4DC]">
              {activeMonth.actionNote}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-[#9A9AA3]">
              Szczegółowa rekomendacja decyzyjna oraz dokładne daty do kalendarza dla miesiąca{' '}
              <strong className="text-white">{activeMonth.monthFull}</strong> otwierają się po
              odblokowaniu wybranego modułu poniżej.
            </p>
          )}
        </div>
      </section>

      {/* UNLOCKED MODULE BREAKDOWNS (Full Actionable Content) */}
      {unlockState.unlockedModules.length > 0 && (
        <section aria-label="Odblokowane moduły raportu 2027" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-white sm:text-2xl">
              Twoje odblokowane moduły ({unlockState.unlockedModules.length})
            </h2>
            {unlockState.orderId && (
              <span className="font-mono text-xs text-[#8E8E98]">
                Nr {unlockState.orderId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {unlockState.unlockedModules.map((modId) => {
              const content = report.modules[modId];
              if (!content) return null;
              return (
                <article
                  key={modId}
                  className="print-card flex flex-col justify-between rounded-[24px] border border-[#4ADE80]/25 bg-[#121215] p-5 sm:p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#4ADE80]">
                        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Odblokowano</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#A1A1AA]">
                        {content.watchDates}
                      </span>
                    </div>

                    <h3 className="font-display mt-2.5 text-xl font-semibold text-white">
                      {content.title}
                    </h3>
                    <p className="print-muted mt-2.5 text-sm leading-relaxed text-[#D4D4DC]">
                      {content.summary}
                    </p>

                    <div className="mt-4 border-t border-white/[0.07] pt-3.5">
                      <p className="text-xs font-semibold text-white">Konkretne kroki na 2027:</p>
                      <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[#C4C4CE]">
                        {content.keyActions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5C35]" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Unlocked Calendar Windows Preview + Download */}
          {unlockState.calendarUnlocked && (
            <div className="print-card rounded-[24px] bg-[#D6D1C4] p-5 text-[#111114] sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#111114]">
                    Kalendarz Złotych i Ryzykownych Dat 2027 (12 okien)
                  </h3>
                  <p className="mt-1 text-xs text-[#4A4842]">
                    Dodaj jednym kliknięciem do Apple Calendar lub Google Calendar — bez przepisywania.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerIcsDownload(report.person1.name, report.calendarEvents)}
                  className="no-print inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#111114] px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>Pobierz plik .ics</span>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {report.calendarEvents.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-[#F5F3EC] p-3 text-xs text-[#111114]"
                  >
                    <p className="font-mono text-[10px] font-semibold uppercase text-[#524F48]">
                      {ev.dateStart} → {ev.dateEnd} · {ev.type === 'golden' ? 'Złote okno' : 'Ostrożność'}
                    </p>
                    <p className="mt-1 font-semibold leading-snug">{ev.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* BLURRED PREMIUM LOCKED PREVIEWS + INTERACTIVE PICK & MIX PAYWALL */}
      {!allUnlocked && (
        <section
          id="modular-paywall"
          aria-label="Konstruktor pakietu raportu 2027"
          className="no-print mt-8"
        >
          {/* Curiosity Blurred Cards */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-medium text-white sm:text-3xl">
              Co jeszcze kryje Twoja matryca na 2027 rok?
            </h2>
            <p className="mt-1.5 text-sm text-[#9A9AA3]">
              Wybierz poniżej tylko te sfery, które chcesz odblokować. Płacisz raz, bez subskrypcji.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {lockedModules.map((mod) => {
                const content = report.modules[mod.id];
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <article
                    key={mod.id}
                    className={`rounded-[22px] border p-5 transition-colors duration-150 ${
                      isSelected
                        ? 'border-[#FF5C35]/70 bg-[#171415]'
                        : 'border-white/[0.08] bg-[#121215]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#A1A1AA]">
                        <Lock className="h-3.5 w-3.5 text-[#FF7B5A]" aria-hidden="true" />
                        <span>{mod.shortTitle}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        aria-pressed={isSelected}
                        className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#FF5C35] text-white'
                            : 'border border-white/15 bg-white/[0.04] text-[#D4D4DC] hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Wybrano' : '+ Dodaj'}
                      </button>
                    </div>

                    <h3 className="font-display mt-3 text-base font-semibold leading-snug text-white">
                      {content.teaserTitle}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#B4B4BE]">
                      {content.teaserSnippet}
                    </p>

                    {/* Subtle blurred locked continuation */}
                    <div
                      aria-hidden="true"
                      className="mt-3 select-none space-y-1.5 blur-[4.5px] opacity-45"
                    >
                      <p className="text-xs text-[#D4D4DC]">
                        Kluczowy przedział dat wymaga weryfikacji warunków umowy oraz unikania pośpiechu w decyzjach.
                      </p>
                      <p className="text-xs text-[#9A9AA3]">
                        1. Przygotuj plan działania przed szczytem kwartału · 2. Zabezpiecz rezerwę czasową.
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* PICK & MIX MODULAR CHECKOUT BOX (Warm Sand Accent Border + High Contrast Dark Checkout) */}
          <div className="rounded-[28px] border border-white/[0.12] bg-[#141418] p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-3 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-xl font-semibold text-white sm:text-2xl">
                  Skonfiguruj swój raport Solaris 2027
                </h2>
                <p className="mt-1 text-xs text-[#9A9AA3]">
                  1 moduł: 14,99 zł · 2: 24,99 zł · 3: 32,99 zł · 4: 39,99 zł · Pełny pakiet: 44,99 zł
                </p>
              </div>
              <button
                type="button"
                onClick={selectFullBundle}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full bg-[#E9D5FF] px-4 py-2 text-xs font-semibold text-[#111114] transition-opacity hover:opacity-90"
              >
                Zaznacz pełny pakiet (44,99 zł + .ics i PDF gratis)
              </button>
            </div>

            {/* Active Downsell or Retention Discount Notice */}
            {useDownsellOffer && downsellSecondsLeft > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#4ADE80]/35 bg-[#4ADE80]/10 px-4 py-3 text-xs text-[#E4FBE9]">
                <span>
                  Aktywna oferta startowa: 1 wybrany moduł + 3 kluczowe daty za{' '}
                  <strong className="font-mono">9,99 zł</strong> zamiast 14,99 zł.
                </span>
                <span className="font-mono shrink-0 font-semibold tabular-nums">
                  {formatTimer(downsellSecondsLeft)}
                </span>
              </div>
            )}

            {hasRetentionDiscount && !useDownsellOffer && (
              <div className="mt-4 rounded-xl border border-[#FF5C35]/40 bg-[#FF5C35]/10 px-4 py-3 text-xs text-[#FFD7CC]">
                Rabat powrotny <strong className="font-mono">-20%</strong> na pełny pakiet jest aktywny (35,99 zł zamiast 44,99 zł).
              </div>
            )}

            {/* Interactive Module Selector Rows */}
            <div className="mt-5 space-y-2.5">
              {lockedModules.map((mod) => {
                const checked = selectedModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex min-h-[58px] cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                      checked
                        ? 'border-[#D8B4FE]/60 bg-white/[0.06]'
                        : 'border-white/[0.07] bg-[#101013] hover:border-white/20'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(mod.id)}
                        className="h-4 w-4 shrink-0 accent-[#FF5C35]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{mod.title}</p>
                        <p className="text-xs text-[#8E8E98]">{mod.tagline}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Order Bump for Partial Bundles */}
            {!pricing.isFullBundle && pricing.moduleCount > 0 && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E9D5FF]/35 bg-[#E9D5FF]/[0.08] p-4 text-xs leading-relaxed text-[#EDE9FE]">
                <input
                  type="checkbox"
                  checked={includeCalendarBump}
                  onChange={(e) => setIncludeCalendarBump(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>
                  <strong className="font-semibold text-white">
                    + Dodaj Kalendarz Złotych i Ryzykownych Dat 2027 do telefonu (Apple / Google Calendar)
                  </strong>{' '}
                  — tylko <span className="font-mono font-semibold text-[#D8B4FE]">9,99 zł</span>
                </span>
              </label>
            )}

            {pricing.isFullBundle && (
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-[#4ADE80]/30 bg-[#4ADE80]/[0.08] px-4 py-3 text-xs text-[#DCFCE7]">
                <Check className="h-4 w-4 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                <span>
                  W pełnym pakiecie otrzymujesz <strong>GRATIS</strong> plik kalendarza .ics (12 okien) oraz wersję A4 PDF do wydruku.
                </span>
              </div>
            )}

            {/* Mandatory Polish Right-of-Withdrawal Waiver Checkbox (UNCHECKED by default) */}
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5 text-[11px] leading-relaxed text-[#A1A1AA]">
              <input
                type="checkbox"
                checked={waiverAccepted}
                onChange={(e) => {
                  setWaiverAccepted(e.target.checked);
                  if (checkoutError) setCheckoutError(null);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
              />
              <span>
                Wyrażam zgodę na dostarczenie spersonalizowanych treści cyfrowych (raport Solaris 2027) przed upływem
                14-dniowego terminu na odstąpienie od umowy i przyjmuję do wiadomości utratę prawa odstąpienia z chwilą
                udostępnienia raportu (art. 38 ust. 1 pkt 13 Ustawy o prawach konsumenta). Akceptuję{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegal('regulamin');
                  }}
                  className="underline hover:text-white"
                >
                  Regulamin
                </button>
                .
              </span>
            </label>

            {checkoutError && (
              <p role="alert" className="mt-3 text-xs font-medium text-[#FF8566]">
                {checkoutError}
              </p>
            )}

            {/* Total + Primary Polish Legal CTA "Kupuję i płacę" */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-[#8E8E98]">Do zapłaty (jednorazowo, BLIK / Apple Pay / Karta)</p>
                <p className="font-mono text-2xl font-bold tabular-nums text-white">
                  {pricing.formattedFinalPln}
                </p>
              </div>

              <button
                type="button"
                disabled={isPaying}
                onClick={handleCheckout}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-7 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B] disabled:opacity-50 sm:w-auto"
              >
                <span>
                  {isPaying
                    ? 'Odblokowywanie raportu...'
                    : `Kupuję i płacę — ${pricing.formattedFinalPln}`}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Trust + Non-Buyer Graceful Rescue Trigger ("Дожим") */}
            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-4 text-xs text-[#8E8E98] sm:flex-row">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#4ADE80]" aria-hidden="true" />
                <span>Natychmiastowy dostęp · Bez subskrypcji</span>
              </span>

              <button
                type="button"
                onClick={() => setShowExitRescueModal(true)}
                className="min-h-[38px] font-medium text-[#C4C4CE] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
              >
                Nie teraz — zapisz skrót na później
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Quiet Footer Action to Run Another Chart */}
      <div className="no-print mt-8 flex justify-center">
        <button
          type="button"
          onClick={onStartFresh}
          className="min-h-[42px] text-xs font-medium text-[#8E8E98] underline decoration-white/20 underline-offset-4 hover:text-white"
        >
          Oblicz nową matrycę dla innej daty lub osoby
        </button>
      </div>

      {/* MOBILE-FIRST COMPACT STICKY RECOVERY BAR (<= 7% mobile height, unpaid users only) */}
      {!hasAnyPurchase && !showExitRescueModal && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.1] bg-[#111114]/95 px-4 py-2.5 backdrop-blur-md sm:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                Alert na {report.riskMonthPl} zablokowany
              </p>
              <p className="font-mono text-[11px] text-[#A1A1AA]">
                Od {useDownsellOffer ? '9,99 zł' : '14,99 zł'} · BLIK
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                document.getElementById('modular-paywall')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full bg-[#FF5C35] px-4 py-2 text-xs font-semibold text-white"
            >
              Odblokuj
            </button>
          </div>
        </div>
      )}

      {/* NON-BUYER RETENTION ("ДОЖИМ") RESCUE SHEET: Downsell 9,99 zł OR Email Follow-Up + -20% */}
      {showExitRescueModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zanim wyjdziesz — oferta na start lub przypomnienie e-mail"
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setShowExitRescueModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/[0.12] bg-[#141418] p-5 text-white sm:rounded-[28px] sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#FF7B5A]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>WAŻNE PRZEZ {formatTimer(downsellSecondsLeft)}</span>
                </p>
                <h3 className="font-display mt-1.5 text-xl font-semibold text-white sm:text-2xl">
                  Nie musisz od razu brać całego pakietu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExitRescueModal(false)}
                aria-label="Zamknij okno"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white hover:bg-white/[0.12]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Option 1: 9,99 zł Single-Module Downsell */}
            <div className="mt-5 rounded-2xl border border-[#FF5C35]/40 bg-[#1B1312] p-4">
              <p className="text-xs font-semibold text-[#FF7B5A]">Opcja 1 · Test na start</p>
              <h4 className="font-display mt-1 text-base font-semibold text-white">
                Odblokuj 1 najpilniejszy moduł + 3 krytyczne daty za{' '}
                <span className="font-mono text-[#4ADE80]">9,99 zł</span>{' '}
                <span className="font-mono text-xs font-normal text-[#8E8E98] line-through">
                  14,99 zł
                </span>
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-[#C4C4CE]">
                Sprawdź jakość analizy na jednym obszarze (np. {report.mode === 'pair' ? 'Zgodność' : 'Finanse i Kariera'}) zanim zdecydujesz o reszcie roku.
              </p>
              <button
                type="button"
                onClick={handleActivateDownsell}
                className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#FF5C35] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#FF6E4B]"
              >
                Aktywuj ofertę startową 9,99 zł
              </button>
            </div>

            {/* Option 2: Email Follow-up + -20% Discount */}
            <div className="mt-4 rounded-2xl border border-white/[0.09] bg-[#101013] p-4">
              <p className="text-xs font-semibold text-[#D8B4FE]">Opcja 2 · Zapisz na później</p>
              <h4 className="font-display mt-1 text-base font-semibold text-white">
                Wyślij bezpłatny skrót + rabat -20% na e-mail
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-[#9A9AA3]">
                Przypomnimy Ci o Twoim miesiącu napięć ({report.riskMonthPl}) i zachowamy rabat na pełny pakiet.
              </p>

              <form onSubmit={handleRescueEmailSubmit} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="rescue-email-input" className="sr-only">
                  Adres e-mail
                </label>
                <input
                  id="rescue-email-input"
                  type="email"
                  placeholder="twoj@email.pl"
                  value={rescueEmail}
                  onChange={(e) => setRescueEmail(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-full border border-white/[0.12] bg-[#17171B] px-4 text-sm text-white placeholder:text-[#6E6E78] focus:border-[#FF5C35] focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#111114] hover:opacity-90"
                >
                  Zapisz i odbierz -20%
                </button>
              </form>

              {rescueStatus.type !== 'idle' && (
                <p
                  role="status"
                  className={`mt-2 text-xs ${
                    rescueStatus.type === 'ok' ? 'text-[#4ADE80]' : 'text-[#FF8566]'
                  }`}
                >
                  {rescueStatus.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
