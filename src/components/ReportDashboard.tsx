import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  Info,
  Lock,
  Printer,
  ShieldCheck,
  Target,
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
import {
  LEGAL_TEXTS,
  type DurableOrderConfirmation,
  type LegalDocId,
} from '../data/legalDocuments';
import { ReportVisualBento } from './ReportVisualBento';

export interface UnlockState {
  paid: boolean;
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  pdfUnlocked: boolean;
  orderId: string | null;
  firstPurchaseAtMs: number | null;
  confirmation: DurableOrderConfirmation | null;
}

export interface PaymentNotice {
  type: 'verifying' | 'success' | 'cancelled' | 'error';
  text: string;
}

interface ReportDashboardProps {
  report: SolarisFullReport;
  unlockState: UnlockState;
  hasRetentionDiscount: boolean;
  paymentNotice?: PaymentNotice | null;
  onDismissPaymentNotice?: () => void;
  onUnlockSuccess: (next: UnlockState, updatedReport?: SolarisFullReport) => void;
  onActivateRetentionDiscount: () => void;
  onSaveFollowUpEmail: (
    email: string,
    marketingConsent: boolean,
  ) => Promise<{ ok: boolean; message: string }>;
  onOpenLegal: (doc: LegalDocId) => void;
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
  paymentNotice,
  onDismissPaymentNotice,
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

  // Default pre-selection: Zgodność + Finanse in pair mode, Finanse in solo mode
  const [selectedModules, setSelectedModules] = useState<ReportModuleId[]>(() =>
    report.mode === 'pair' ? ['zgodnosc', 'finanse'] : ['finanse'],
  );
  const [includeCalendarBump, setIncludeCalendarBump] = useState(false);

  // Mandatory unchecked checkboxes before payment (P0.7)
  const [termsAndAgeAccepted, setTermsAndAgeAccepted] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [secondPersonConsentAccepted, setSecondPersonConsentAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [copiedConfirmation, setCopiedConfirmation] = useState(false);
  const [pendingStripeCheckout, setPendingStripeCheckout] = useState<{
    checkoutUrl: string;
    stripeSessionId: string;
    orderId: string;
    amountPln: string;
    stripeMode?: string;
  } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pendingStatusMsg, setPendingStatusMsg] = useState<string | null>(null);

  // Interactive monthly timeline focus
  const peakMonthIdx = useMemo(() => {
    const peak = report.monthlyTimeline.reduce(
      (best, curr) => (curr.energy > best.energy ? curr : best),
      report.monthlyTimeline[0],
    );
    return peak.monthIndex;
  }, [report.monthlyTimeline]);

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(peakMonthIdx);
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'golden' | 'risk'>('all');

  // Non-buyer retention ("Дожим") state
  const [showExitRescueModal, setShowExitRescueModal] = useState(false);
  const [useDownsellOffer, setUseDownsellOffer] = useState(false);
  const [downsellSecondsLeft, setDownsellSecondsLeft] = useState(600); // 10 min
  const [rescueEmail, setRescueEmail] = useState('');
  const [rescueMarketingConsent, setRescueMarketingConsent] = useState(false);
  const [rescueStatus, setRescueStatus] = useState<{
    type: 'idle' | 'ok' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });

  // Post-purchase 15-minute upsell timer + required consents
  const [upsellSecondsLeft, setUpsellSecondsLeft] = useState(900);
  const [upsellTermsAccepted, setUpsellTermsAccepted] = useState(false);
  const [upsellWaiver, setUpsellWaiver] = useState(false);
  const [upsellSecondPerson, setUpsellSecondPerson] = useState(false);
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

  const focusModuleInPaywall = (id: ReportModuleId) => {
    setCheckoutError(null);
    setSelectedModules((prev) => (prev.includes(id) ? prev : [...prev, id]));
    document.getElementById('modular-paywall')?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectFullBundle = () => {
    setCheckoutError(null);
    setUseDownsellOffer(false);
    setSelectedModules(availableModules.map((m) => m.id));
  };

  const verifyPendingStripePayment = async (stripeSessionId: string, silent = false) => {
    if (!silent) {
      setCheckingPayment(true);
      setPendingStatusMsg(null);
    }
    try {
      const res = await fetch(
        `/api/checkout/verify?sessionId=${encodeURIComponent(report.sessionId)}&stripe_session_id=${encodeURIComponent(stripeSessionId)}`,
      );
      const json = (await res.json()) as {
        ok?: boolean;
        verified?: boolean;
        unlockState?: UnlockState;
        report?: SolarisFullReport | null;
        error?: string;
      };
      if (res.ok && json.verified && json.unlockState) {
        onUnlockSuccess(json.unlockState, json.report ?? undefined);
        setPendingStripeCheckout(null);
        setPendingStatusMsg(null);
        setTermsAndAgeAccepted(false);
        setWaiverAccepted(false);
        setSecondPersonConsentAccepted(false);
        setMarketingConsent(false);
        setUseDownsellOffer(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;
      }
      if (!silent) {
        setPendingStatusMsg(
          json.error ||
            'Płatność nie została jeszcze sfinalizowana w Stripe. Dokończ ją w otwartej karcie i kliknij ponownie.',
        );
      }
      return false;
    } catch {
      if (!silent) {
        setPendingStatusMsg('Nie udało się sprawdzić statusu płatności. Spróbuj ponownie za chwilę.');
      }
      return false;
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  };

  // Auto-verify when returning from Stripe tab in iframe preview mode
  useEffect(() => {
    if (!pendingStripeCheckout) return;
    const handleFocus = () => {
      void verifyPendingStripePayment(pendingStripeCheckout.stripeSessionId, true);
    };
    window.addEventListener('focus', handleFocus);
    const interval = window.setInterval(() => {
      void verifyPendingStripePayment(pendingStripeCheckout.stripeSessionId, true);
    }, 5000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStripeCheckout]);

  const launchStripeCheckout = (payload: {
    checkoutUrl: string;
    stripeSessionId: string;
    orderId: string;
    amountPln: string;
    stripeMode?: string;
  }) => {
    // Defense-in-depth: only allow Stripe's official hosted checkout origin
    if (!payload.checkoutUrl.startsWith('https://checkout.stripe.com/')) {
      setCheckoutError('Otrzymano nieprawidłowy adres przekierowania płatności.');
      return;
    }

    setPendingStripeCheckout(payload);
    setPendingStatusMsg(null);

    // Top-level window redirects directly to Stripe Checkout; embedded preview iframes show a new-tab launch button (Stripe blocks iframe embedding)
    let isEmbeddedIframe = false;
    try {
      isEmbeddedIframe = window.self !== window.top;
    } catch {
      isEmbeddedIframe = true;
    }

    if (!isEmbeddedIframe) {
      window.location.assign(payload.checkoutUrl);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCheckout = async () => {
    if (selectedModules.length === 0) {
      setCheckoutError('Zaznacz co najmniej jeden moduł, aby przejść do płatności.');
      return;
    }
    if (!termsAndAgeAccepted) {
      setCheckoutError(
        'Zaznacz potwierdzenie ukończenia 18 lat oraz akceptację Regulaminu i Polityki prywatności.',
      );
      return;
    }
    if (!waiverAccepted) {
      setCheckoutError(
        'Zaznacz zgodę na rozpoczęcie dostarczania Raportu przed upływem 14 dni oraz informację o utracie prawa odstąpienia.',
      );
      return;
    }
    if (report.mode === 'pair' && !secondPersonConsentAccepted) {
      setCheckoutError(
        'W trybie „Dla dwojga” wymagane jest oświadczenie dotyczące pełnoletności i poinformowania drugiej osoby.',
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
          personName: report.person1.name,
          mode: report.mode,
          selectedModules,
          includeCalendarBump,
          hasRetentionDiscount,
          useDownsellOffer: useDownsellOffer && downsellSecondsLeft > 0,
          termsAndAgeAccepted: true,
          withdrawalWaiverAccepted: true,
          secondPersonConsentAccepted: report.mode === 'pair' ? secondPersonConsentAccepted : false,
          marketingConsent,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        requiresRedirect?: boolean;
        checkoutUrl?: string;
        stripeSessionId?: string;
        stripeMode?: string;
        orderId?: string;
        amountPln?: string;
        error?: string;
      };

      if (!response.ok || !json.ok || !json.checkoutUrl || !json.stripeSessionId) {
        setCheckoutError(json.error || LEGAL_TEXTS.paymentFailedError);
        return;
      }

      launchStripeCheckout({
        checkoutUrl: json.checkoutUrl,
        stripeSessionId: json.stripeSessionId,
        orderId: json.orderId || '',
        amountPln: json.amountPln || pricing.formattedFinalPln,
        stripeMode: json.stripeMode,
      });
    } catch {
      setCheckoutError(LEGAL_TEXTS.paymentFailedError);
    } finally {
      setIsPaying(false);
    }
  };

  const handleUpsellRemaining = async () => {
    if (!upsellTermsAccepted || !upsellWaiver || (report.mode === 'pair' && !upsellSecondPerson)) {
      setUpsellError('Zaznacz wymagane oświadczenia przed złożeniem zamówienia.');
      return;
    }
    setUpsellError(null);
    setIsPaying(true);
    try {
      const response = await fetch('/api/report/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: report.sessionId,
          personName: report.person1.name,
          mode: report.mode,
          selectedModules: availableModules.map((m) => m.id),
          includeCalendarBump: true,
          isUpsell: true,
          termsAndAgeAccepted: true,
          withdrawalWaiverAccepted: true,
          secondPersonConsentAccepted: report.mode === 'pair' ? upsellSecondPerson : false,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        requiresRedirect?: boolean;
        checkoutUrl?: string;
        stripeSessionId?: string;
        stripeMode?: string;
        orderId?: string;
        amountPln?: string;
        error?: string;
      };
      if (!response.ok || !json.ok || !json.checkoutUrl || !json.stripeSessionId) {
        setUpsellError(json.error || LEGAL_TEXTS.paymentFailedError);
        return;
      }

      launchStripeCheckout({
        checkoutUrl: json.checkoutUrl,
        stripeSessionId: json.stripeSessionId,
        orderId: json.orderId || '',
        amountPln: json.amountPln || formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE),
        stripeMode: json.stripeMode,
      });
    } catch {
      setUpsellError(LEGAL_TEXTS.paymentFailedError);
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
    if (!rescueMarketingConsent) {
      setRescueStatus({
        type: 'error',
        text: 'Zaznacz dobrowolną zgodę na otrzymywanie wiadomości e-mail.',
      });
      return;
    }
    const res = await onSaveFollowUpEmail(rescueEmail, rescueMarketingConsent);
    setRescueStatus({ type: res.ok ? 'ok' : 'error', text: res.message });
    if (res.ok) {
      onActivateRetentionDiscount();
      setRescueEmail('');
      setRescueMarketingConsent(false);
    }
  };

  const handleCopyConfirmation = async () => {
    if (!unlockState.confirmation) return;
    try {
      await navigator.clipboard.writeText(unlockState.confirmation.plainTextBody);
      setCopiedConfirmation(true);
      window.setTimeout(() => setCopiedConfirmation(false), 2400);
    } catch {
      // ignore clipboard errors
    }
  };

  const activeMonth = report.monthlyTimeline[selectedMonthIdx] ?? report.monthlyTimeline[0];
  const isMonthDetailOpen = hasAnyPurchase || activeMonth.monthIndex === peakMonthIdx;

  const filteredCalendarEvents = useMemo(() => {
    if (calendarFilter === 'all') return report.calendarEvents;
    return report.calendarEvents.filter((ev) => ev.type === calendarFilter);
  }, [report.calendarEvents, calendarFilter]);

  return (
    <main className="mx-auto w-full max-w-[1160px] px-4 pb-24 pt-6 sm:px-6 sm:pt-9">
      {/* Stripe Return Status Notice (verified / cancelled / verifying) */}
      {paymentNotice && (
        <div
          role={paymentNotice.type === 'error' ? 'alert' : 'status'}
          className={`no-print mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-xs leading-relaxed ${
            paymentNotice.type === 'success'
              ? 'border-[#4ADE80]/40 bg-[#111D16] text-[#DCFCE7]'
              : paymentNotice.type === 'error'
                ? 'border-[#FF5C35]/45 bg-[#201311] text-[#FFD7CC]'
                : 'border-white/[0.14] bg-[#16161B] text-[#E4E4EA]'
          }`}
        >
          <span>{paymentNotice.text}</span>
          {onDismissPaymentNotice && (
            <button
              type="button"
              onClick={onDismissPaymentNotice}
              aria-label="Zamknij komunikat"
              className="shrink-0 rounded-full p-1 text-white/60 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Pending Stripe Checkout Launch Card (used automatically in iframe previews or if redirect is blocked) */}
      {pendingStripeCheckout && (
        <div
          role="region"
          aria-label="Przejdź do płatności Stripe"
          className="no-print mb-6 rounded-[24px] border border-[#FF5C35]/50 bg-[#1A1312] p-5 text-sm text-white shadow-xl"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#FF8C70]">
                Sesja Stripe gotowa · Zamówienie {pendingStripeCheckout.orderId}
              </p>
              <h2 className="font-display text-base font-semibold text-white">
                Dokończ bezpieczną płatność {pendingStripeCheckout.amountPln} w Stripe
              </h2>
              <p className="text-xs leading-relaxed text-[#C4C4CE]">
                Po opłaceniu zamówienia w oknie Stripe wróć tutaj — raport odblokuje się automatycznie po weryfikacji po stronie serwera.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={pendingStripeCheckout.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#FF6E4B]"
              >
                <span>Otwórz płatność Stripe ({pendingStripeCheckout.amountPln})</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                disabled={checkingPayment}
                onClick={() => void verifyPendingStripePayment(pendingStripeCheckout.stripeSessionId)}
                className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-xs font-medium text-white hover:bg-white/[0.12] disabled:opacity-50"
              >
                {checkingPayment ? 'Sprawdzam...' : 'Sprawdź status płatności'}
              </button>
            </div>
          </div>

          {pendingStatusMsg && (
            <p className="mt-3 text-xs text-[#FFD7CC]">{pendingStatusMsg}</p>
          )}
        </div>
      )}

      {/* DURABLE POST-PURCHASE ORDER CONFIRMATION (Trwały nośnik — teksty-do-formularzy.md sekcja 3) */}
      {hasAnyPurchase && unlockState.confirmation && (
        <section
          aria-label="Potwierdzenie zamówienia na trwałym nośniku"
          className="print-card mb-6 rounded-[24px] border border-[#4ADE80]/35 bg-[#111915] p-5 text-xs text-[#DCFCE7] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#4ADE80]/20 pb-3.5">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#4ADE80]">
                Potwierdzenie zamówienia (trwały nośnik) · Nr {unlockState.confirmation.orderId}
              </p>
              <h2 className="font-display mt-1 text-base font-semibold text-white sm:text-lg">
                {unlockState.confirmation.subject}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCopyConfirmation}
              className="no-print inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#4ADE80]/35 bg-[#4ADE80]/10 px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#4ADE80]/20"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{copiedConfirmation ? 'Skopiowano' : 'Kopiuj potwierdzenie'}</span>
            </button>
          </div>

          <dl className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] text-[#86EFAC]">Produkt</dt>
              <dd className="mt-0.5 font-medium text-white">
                Raport Solaris 2027 ({unlockState.confirmation.variantLabel})
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-[#86EFAC]">Cena brutto</dt>
              <dd className="mt-0.5 font-mono font-semibold text-white">
                {unlockState.confirmation.priceGrossPln}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-[#86EFAC]">Data zamówienia</dt>
              <dd className="mt-0.5 font-mono text-white">{unlockState.confirmation.orderedAtPl}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-[#86EFAC]">Link do Raportu</dt>
              <dd className="mt-0.5 truncate font-mono text-[11px] text-[#BBF7D0]">
                {unlockState.confirmation.reportUrl}
              </dd>
            </div>
          </dl>

          <ul className="mt-3.5 space-y-1.5 border-t border-[#4ADE80]/15 pt-3 text-[11px] leading-relaxed text-[#BBF7D0]">
            <li>
              • Na Twoje wyraźne żądanie rozpoczęliśmy dostarczanie Raportu przed upływem 14-dniowego terminu do odstąpienia od umowy. Zgodnie z art. 38 ustawy o prawach konsumenta oznacza to utratę prawa odstąpienia, o czym zostałeś/aś poinformowany/a przed zakupem.
            </li>
            <li>
              • Dokumenty:{' '}
              <a
                href="/regulamin"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal('regulamin');
                }}
                className="underline hover:text-white"
              >
                Regulamin
              </a>{' '}
              oraz{' '}
              <a
                href="/polityka-prywatnosci"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal('polityka');
                }}
                className="underline hover:text-white"
              >
                Polityka prywatności
              </a>
              . Wsparcie i reklamacje: {unlockState.confirmation.contactEmail}.
            </li>
          </ul>
        </section>
      )}

      {/* POST-PURCHASE 15-MINUTE UPSELL BANNER (Partial buyers only) */}
      {hasAnyPurchase && !allUnlocked && upsellSecondsLeft > 0 && (
        <section
          aria-label="Oferta specjalna po zakupie"
          className="no-print mb-6 rounded-[22px] border border-[#FF5C35]/50 bg-[#1B1312] p-4 sm:p-5"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold tabular-nums text-[#FF7B5A]">
                OFERTA JEDNORAZOWA · WYGASA ZA {formatTimer(upsellSecondsLeft)}
              </p>
              <h2 className="font-display text-lg font-semibold text-white">
                Odblokuj wszystkie pozostałe moduły ({lockedModules.length}) + Kalendarz .ics i PDF A4 za{' '}
                {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
              </h2>
              <p className="text-xs text-[#C4C4CE]">
                Zamiast dopłacać osobno za każdą sferę, uzupełnij cały raport 2027 jednym zamówieniem.
              </p>
            </div>

            <div className="flex max-w-md shrink-0 flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2 text-[11px] text-[#D4D4DC]">
                <input
                  type="checkbox"
                  checked={upsellTermsAccepted}
                  onChange={(e) => {
                    setUpsellTermsAccepted(e.target.checked);
                    if (upsellError) setUpsellError(null);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>
                  Mam ukończone 18 lat i akceptuję{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('regulamin')}
                    className="underline hover:text-white"
                  >
                    Regulamin
                  </button>{' '}
                  oraz{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('polityka')}
                    className="underline hover:text-white"
                  >
                    Politykę prywatności
                  </button>
                  .
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2 text-[11px] text-[#D4D4DC]">
                <input
                  type="checkbox"
                  checked={upsellWaiver}
                  onChange={(e) => {
                    setUpsellWaiver(e.target.checked);
                    if (upsellError) setUpsellError(null);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>{LEGAL_TEXTS.checkbox2Withdrawal}</span>
              </label>

              {report.mode === 'pair' && (
                <label className="flex cursor-pointer items-start gap-2 text-[11px] text-[#D4D4DC]">
                  <input
                    type="checkbox"
                    checked={upsellSecondPerson}
                    onChange={(e) => {
                      setUpsellSecondPerson(e.target.checked);
                      if (upsellError) setUpsellError(null);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                  />
                  <span>{LEGAL_TEXTS.checkbox3SecondPerson}</span>
                </label>
              )}

              <button
                type="button"
                disabled={isPaying}
                onClick={handleUpsellRemaining}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#FF5C35] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#FF6E4B] disabled:opacity-50"
              >
                Zamawiam i płacę {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
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

      {/* TOP EPHEMERIS EXECUTIVE HEADER (Free Layer + Report Top Disclaimer + Honest Unknown-Time Note) */}
      <section className="print-card rounded-[26px] border border-white/[0.09] bg-[#121215] p-5 sm:p-8">
        <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#9A9AA3]">
          {LEGAL_TEXTS.reportTopBottomDisclaimer}
        </div>

        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-xs tabular-nums text-[#D8B4FE]">
              Solariusz 2027 · {report.ephemeris.solarReturnDisplayPl} · {report.ephemeris.cityResolved} ({report.ephemeris.timeZoneUsed})
            </p>
            <h1 className="font-display mt-2 text-2xl font-medium leading-tight text-white sm:text-3xl">
              {report.freeCoreVectorTitle}
            </h1>
            <p className="print-muted mt-2.5 max-w-3xl text-sm leading-relaxed text-[#C4C4CE]">
              {report.freeCoreVectorBody}
            </p>

            {/* Honest unknown birth time note (P0.3) */}
            {report.ephemeris.omittedTimeDependentElements && report.ephemeris.unknownTimeNotePl && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#D8B4FE]/25 bg-[#D8B4FE]/[0.07] px-3 py-2 text-xs text-[#E9D5FF]">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{report.ephemeris.unknownTimeNotePl}</span>
              </p>
            )}
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

      {/* SIGNATURE 4-CARD PERSONALIZED BENTO DASHBOARD (Exact mirror of Landing Preview with REAL user data!) */}
      <ReportVisualBento
        report={report}
        unlockedModules={unlockState.unlockedModules}
        calendarUnlocked={unlockState.calendarUnlocked}
        onFocusModulePaywall={focusModuleInPaywall}
      />

      {/* FREE DIAGNOSTIC BRIEF: Open Insight + Behavioral Synthesis + 4 Planetary Signals */}
      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Open Start Analysis + Behavioral Profile vs 2027 */}
        <article className="print-card flex flex-col justify-between rounded-[24px] bg-[#F5F3EC] p-5 text-[#111114] sm:p-6 lg:col-span-7">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B6B73]">
              Bezpłatna diagnoza Solariusza i profilu (0 zł)
            </p>
            <h2 className="font-display mt-1.5 text-xl font-semibold leading-snug text-[#111114]">
              {report.freeOpenInsightTitle}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#383631]">
              {report.freeOpenInsightBody}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#111114]/10 pt-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-semibold text-[#111114]">
                {report.behavioralSynthesis.strengthTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#4E4C46]">
                {report.behavioralSynthesis.strengthText}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-semibold text-[#991B1B]">
                {report.behavioralSynthesis.blindSpotTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#4E4C46]">
                {report.behavioralSynthesis.blindSpotText}
              </p>
            </div>
          </div>
        </article>

        {/* Right: Pair Compatibility Card (if Pair) OR 4 Planetary Signals Decoder */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {report.mode === 'pair' && report.compatibilityScore !== null && (
            <article className="print-card rounded-[24px] bg-[#E9D5FF] p-5 text-[#111114] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#4C1D95]">
                    Bezpłatny wynik zgodności 2027
                  </p>
                  <h2 className="font-display mt-1 text-lg font-semibold leading-snug text-[#111114]">
                    {report.compatibilityHeadline}
                  </h2>
                </div>
                <span className="font-mono shrink-0 rounded-full bg-[#111114] px-3 py-1 text-sm font-bold tabular-nums text-white">
                  {report.compatibilityScore}%
                </span>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-[#2F2440] sm:text-sm">
                {report.compatibilityFreeInsight}
              </p>
              {report.compatibilityBreakdown && (
                <p className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-xs font-medium text-[#2F2440]">
                  <strong className="text-[#111114]">Punkt testu:</strong>{' '}
                  {report.compatibilityBreakdown.frictionTrigger}
                </p>
              )}
            </article>
          )}

          {/* 4 Concrete Planetary Takeaways from 2027 Solar Return */}
          <article className="print-card flex-1 rounded-[24px] border border-white/[0.09] bg-[#121215] p-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#D8B4FE]">
              Co oznaczają Twoje planety w 2027
            </p>
            <div className="mt-3 space-y-3">
              {report.planetarySignals.map((sig) => (
                <div
                  key={sig.planetPl}
                  className="border-b border-white/[0.06] pb-2.5 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-white">
                      {sig.planetPl} · {sig.signPl}
                    </span>
                    <span className="font-mono text-[10px] text-[#9A9AA3]">{sig.domainPl}</span>
                  </div>
                  <p className="print-muted mt-1 text-xs leading-relaxed text-[#B4B4BE]">
                    {sig.practicalTakeaway}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* INTERACTIVE 12-MONTH TIMELINE (Jan–Dec 2027 with concrete transit + free hook + unlocked checklist) */}
      <section className="print-card mt-5 rounded-[26px] border border-white/[0.09] bg-[#121215] p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
              Oś 12 miesięcy 2027: Styczeń – Grudzień
            </h2>
            <p className="print-muted mt-1 text-xs text-[#8E8E98]">
              Kliknij miesiąc, aby sprawdzić poziom energii, ryzyka i konkretny sygnał tranzytowy.
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
                    ? 'border-white/35 bg-white/[0.1]'
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

        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#17171C] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#D8B4FE]">
                {activeMonth.transitLabel}
              </span>
              <h3 className="font-display mt-0.5 text-base font-semibold text-white sm:text-lg">
                {activeMonth.monthFull}: {activeMonth.headline}
              </h3>
            </div>
            <span className="font-mono rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs tabular-nums text-[#D4D4DC]">
              Energia {activeMonth.energy}% · Ryzyko {activeMonth.risk}%
            </span>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-[#D4D4DC]">
            {activeMonth.freeHook}
          </p>

          {isMonthDetailOpen ? (
            <div className="mt-3 rounded-xl border border-[#4ADE80]/25 bg-[#4ADE80]/[0.06] p-3.5 text-xs leading-relaxed text-[#E4FBE9] sm:text-sm">
              <strong className="font-semibold text-[#4ADE80]">
                {hasAnyPurchase ? 'Plan działania na ten miesiąc: ' : 'Otwarta wskazówka dla Twojego szczytu: '}
              </strong>
              {activeMonth.actionNote}
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 sm:flex-row sm:items-center">
              <p className="text-xs leading-relaxed text-[#9A9AA3]">
                Szczegółowa checklista decyzji oraz dokładne dni podwyższonego ryzyka dla{' '}
                <strong className="text-white">{activeMonth.monthFull}</strong> otwierają się po
                odblokowaniu wybranego modułu poniżej.
              </p>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('modular-paywall')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="no-print shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                Odblokuj ten miesiąc
              </button>
            </div>
          )}
        </div>
      </section>

      {/* UNLOCKED MODULE DEEP DOSSIERS (Full Actionable Value) */}
      {unlockState.unlockedModules.length > 0 && (
        <section aria-label="Odblokowane moduły raportu 2027" className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-white sm:text-2xl">
                Twoje pełne analizy 2027 ({unlockState.unlockedModules.length})
              </h2>
              <p className="text-xs text-[#8E8E98]">
                Strategia, konkretne kroki, czerwone flagi i benchmarki kontrolne dla wybranych sfer.
              </p>
            </div>
            {unlockState.orderId && (
              <span className="font-mono text-xs text-[#8E8E98]">
                Nr {unlockState.orderId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5">
            {unlockState.unlockedModules.map((modId) => {
              const content = report.modules[modId];
              if (!content) return null;
              return (
                <article
                  key={modId}
                  className="print-card rounded-[26px] border border-[#4ADE80]/30 bg-[#121215] p-5 sm:p-7"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#4ADE80]">
                        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Odblokowano · Potencjał {content.scoreOutOf10}/10</span>
                      </span>
                      <h3 className="font-display mt-1 text-xl font-semibold text-white sm:text-2xl">
                        {content.title}
                      </h3>
                    </div>
                    <span className="font-mono rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#D4D4DC]">
                      {content.watchDates}
                    </span>
                  </div>

                  {/* Two deep editorial paragraphs */}
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm leading-relaxed text-[#D4D4DC] md:grid-cols-2">
                    <p className="print-muted">{content.summary}</p>
                    <p className="print-muted">{content.deepDive}</p>
                  </div>

                  {/* 2-Column Tactical Matrix: Rób to vs Czerwone flagi */}
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#4ADE80]/20 bg-[#4ADE80]/[0.05] p-4">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4ADE80]">
                        <Target className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Rób to w 2027 (3 konkretne ruchy)</span>
                      </p>
                      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#E4E4EA]">
                        {content.keyActions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ADE80]" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-[#FF5C35]/25 bg-[#FF5C35]/[0.06] p-4">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF8566]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Czerwone flagi — tego unikaj</span>
                      </p>
                      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#E4E4EA]">
                        {content.avoidList.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5C35]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Mid-year Concrete Benchmark */}
                  <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#17171C] px-4 py-3 text-xs text-[#C4C4CE]">
                    <strong className="text-white">Punkt kontrolny: </strong>
                    {content.checkpoint}
                  </div>
                </article>
              );
            })}
          </div>

          {/* FULL 12-WINDOW FILTERABLE CALENDAR + .ICS DOWNLOAD */}
          {unlockState.calendarUnlocked && (
            <div className="print-card rounded-[26px] bg-[#D6D1C4] p-5 text-[#111114] sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#111114] sm:text-2xl">
                    Kalendarz Złotych i Ryzykownych Dat 2027 (wszystkie 12 okien)
                  </h3>
                  <p className="mt-1 text-xs text-[#4A4842] sm:text-sm">
                    Dodaj jednym kliknięciem do Apple Calendar lub Google Calendar — każde okno ma gotowy opis działania.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerIcsDownload(report.person1.name, report.calendarEvents)}
                  className="no-print inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#111114] px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>Pobierz plik .ics (12 okien)</span>
                </button>
              </div>

              <div
                role="group"
                aria-label="Filtr okien kalendarza"
                className="no-print mt-4 flex flex-wrap gap-2"
              >
                {(
                  [
                    { id: 'all', label: `Wszystkie (${report.calendarEvents.length})` },
                    {
                      id: 'golden',
                      label: `Złote okna (${report.calendarEvents.filter((e) => e.type === 'golden').length})`,
                    },
                    {
                      id: 'risk',
                      label: `Ostrożność (${report.calendarEvents.filter((e) => e.type === 'risk').length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCalendarFilter(tab.id)}
                    aria-pressed={calendarFilter === tab.id}
                    className={`min-h-[34px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      calendarFilter === tab.id
                        ? 'bg-[#111114] text-white'
                        : 'bg-[#F5F3EC] text-[#3E3C37] hover:bg-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCalendarEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col justify-between rounded-xl bg-[#F5F3EC] p-3.5 text-xs text-[#111114]"
                  >
                    <div>
                      <p
                        className={`font-mono text-[10px] font-semibold uppercase ${
                          ev.type === 'golden' ? 'text-[#166534]' : 'text-[#991B1B]'
                        }`}
                      >
                        {ev.dateStart} → {ev.dateEnd} ·{' '}
                        {ev.type === 'golden' ? 'Złote okno' : 'Ostrożność'}
                      </p>
                      <p className="mt-1 font-semibold leading-snug">{ev.title}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#4E4C46]">
                      {ev.summary}
                    </p>
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
              Każdy odblokowany moduł zawiera 2-częściową diagnozę, 3 konkretne ruchy, listę czerwonych flag i dokładne okna dat.
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
                        <span>
                          {mod.shortTitle} · {content.scoreOutOf10}/10
                        </span>
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
                        1. Przygotuj plan działania przed szczytem kwartału · 2. Czerwone flagi i punkt kontrolny.
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* PICK & MIX MODULAR CHECKOUT BOX */}
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

            {/* Full Checkout Disclaimer (teksty-do-formularzy.md sekcja 1) */}
            <p className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-[#9A9AA3]">
              {LEGAL_TEXTS.checkoutFullDisclaimer}
            </p>

            {/* Mandatory UNCHECKED Polish Legal Checkboxes (P0.7) */}
            <div className="mt-4 space-y-2.5">
              {/* Checkbox 1: 18+ & Regulamin & Polityka prywatności (REQUIRED) */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5 text-[11px] leading-relaxed text-[#C4C4CE]">
                <input
                  type="checkbox"
                  checked={termsAndAgeAccepted}
                  onChange={(e) => {
                    setTermsAndAgeAccepted(e.target.checked);
                    if (checkoutError) setCheckoutError(null);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>
                  <strong className="text-[#FF7B5A]">*</strong> Mam ukończone 18 lat i akceptuję{' '}
                  <a
                    href="/regulamin"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenLegal('regulamin');
                    }}
                    className="text-white underline hover:text-[#FF7B5A]"
                  >
                    Regulamin
                  </a>{' '}
                  oraz zapoznałem/am się z{' '}
                  <a
                    href="/polityka-prywatnosci"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenLegal('polityka');
                    }}
                    className="text-white underline hover:text-[#FF7B5A]"
                  >
                    Polityką prywatności
                  </a>
                  .
                </span>
              </label>

              {/* Checkbox 2: Immediate digital delivery & loss of right of withdrawal (REQUIRED) */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5 text-[11px] leading-relaxed text-[#C4C4CE]">
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
                  <strong className="text-[#FF7B5A]">*</strong> {LEGAL_TEXTS.checkbox2Withdrawal}
                </span>
              </label>

              {/* Checkbox 3: Second person consent (REQUIRED ONLY in pair mode) */}
              {report.mode === 'pair' && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#101013] p-3.5 text-[11px] leading-relaxed text-[#C4C4CE]">
                  <input
                    type="checkbox"
                    checked={secondPersonConsentAccepted}
                    onChange={(e) => {
                      setSecondPersonConsentAccepted(e.target.checked);
                      if (checkoutError) setCheckoutError(null);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                  />
                  <span>
                    <strong className="text-[#FF7B5A]">*</strong> {LEGAL_TEXTS.checkbox3SecondPerson}
                  </span>
                </label>
              )}

              {/* Checkbox 4: Optional separate email marketing consent */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-[#9A9AA3]">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>{LEGAL_TEXTS.checkbox4Marketing} (opcjonalnie)</span>
              </label>
            </div>

            {checkoutError && (
              <p role="alert" className="mt-3 text-xs font-medium text-[#FF8566]">
                {checkoutError}
              </p>
            )}

            {/* Total + Exact Polish Legal Payment CTA: "Zamawiam i płacę [cena]" */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-[#8E8E98]">Do zapłaty brutto (jednorazowo · Stripe / BLIK / Karta)</p>
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
                    ? 'Przetwarzanie zamówienia...'
                    : `Zamawiam i płacę ${pricing.formattedFinalPln}`}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Required 1-line Disclaimer + Stripe obligation notice directly beneath CTA */}
            <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-[#8E8E98]">
              <p className="text-[#A1A1AA]">{LEGAL_TEXTS.underPayButtonDisclaimer}</p>
              <p>{LEGAL_TEXTS.underPayButtonStripeNote}</p>
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

      {/* Report Bottom Disclaimer + Quiet Footer Action */}
      <footer className="mt-8 space-y-4 border-t border-white/[0.07] pt-6 text-center">
        <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-[#8E8E98]">
          {LEGAL_TEXTS.reportTopBottomDisclaimer}
        </p>
        <div className="no-print flex flex-wrap items-center justify-center gap-5 text-xs text-[#8E8E98]">
          <button
            type="button"
            onClick={onStartFresh}
            className="min-h-[42px] font-medium underline decoration-white/20 underline-offset-4 hover:text-white"
          >
            Oblicz nową matrycę dla innej daty lub osoby
          </button>
          <a
            href="/regulamin"
            onClick={(e) => {
              e.preventDefault();
              onOpenLegal('regulamin');
            }}
            className="hover:text-white"
          >
            Regulamin
          </a>
          <a
            href="/polityka-prywatnosci"
            onClick={(e) => {
              e.preventDefault();
              onOpenLegal('polityka');
            }}
            className="hover:text-white"
          >
            Polityka prywatności
          </a>
        </div>
      </footer>

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

              <form onSubmit={handleRescueEmailSubmit} noValidate className="mt-3 space-y-2.5">
                <div className="flex flex-col gap-2 sm:flex-row">
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
                </div>

                {/* Unchecked separate marketing consent checkbox (P1.11) */}
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-[#9A9AA3]">
                  <input
                    type="checkbox"
                    checked={rescueMarketingConsent}
                    onChange={(e) => {
                      setRescueMarketingConsent(e.target.checked);
                      if (rescueStatus.type === 'error') {
                        setRescueStatus({ type: 'idle', text: '' });
                      }
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#FF5C35]"
                  />
                  <span>
                    {LEGAL_TEXTS.checkbox4Marketing} Szczegóły w{' '}
                    <a
                      href="/polityka-prywatnosci"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenLegal('polityka');
                      }}
                      className="underline hover:text-white"
                    >
                      Polityce prywatności
                    </a>
                    .
                  </span>
                </label>
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
