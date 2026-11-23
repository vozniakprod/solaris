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
  Mail,
  MailCheck,
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
  isValidEmailAddress,
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
import {
  PostPurchaseUpsellCard,
  ReportCheckoutSection,
} from './ReportCheckoutSection';
import {
  parsePlnAmountToNumber,
  trackTikTokCompletePayment,
  trackTikTokInitiateCheckout,
} from '../utils/tiktokPixel';

export interface UnlockState {
  paid: boolean;
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  pdfUnlocked: boolean;
  orderId: string | null;
  lastStripeSessionId?: string | null;
  customerEmail?: string | null;
  emailDeliveredTo?: string | null;
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

  // Default pre-selection: Full Package (clear best-value anchor; 1 click to switch to single modules)
  const [selectedModules, setSelectedModules] = useState<ReportModuleId[]>(() =>
    getAvailableModulesForMode(report.mode).map((m) => m.id),
  );
  const [includeCalendarBump, setIncludeCalendarBump] = useState(false);

  // Mandatory unchecked checkboxes before payment (P0.7)
  const [termsAndAgeAccepted, setTermsAndAgeAccepted] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [secondPersonConsentAccepted, setSecondPersonConsentAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [checkoutEmail, setCheckoutEmail] = useState<string>(
    () => unlockState.customerEmail || '',
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [copiedConfirmation, setCopiedConfirmation] = useState(false);
  const [resendEmailInput, setResendEmailInput] = useState<string>(
    () => unlockState.customerEmail || '',
  );
  const [isSendingReportEmail, setIsSendingReportEmail] = useState(false);
  const [reportEmailStatus, setReportEmailStatus] = useState<{
    type: 'idle' | 'ok' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });
  const [pendingStripeCheckout, setPendingStripeCheckout] = useState<{
    checkoutUrl: string;
    stripeSessionId: string;
    orderId: string;
    amountPln: string;
    stripeMode?: string;
  } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pendingStatusMsg, setPendingStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (unlockState.customerEmail && !resendEmailInput) {
      setResendEmailInput(unlockState.customerEmail);
    }
  }, [unlockState.customerEmail, resendEmailInput]);

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
    setUseDownsellOffer(false);
    setSelectedModules((prev) =>
      prev.length >= availableModules.length ? [id] : prev.includes(id) ? prev : [...prev, id],
    );
    document.getElementById('checkout-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectFullBundle = () => {
    setCheckoutError(null);
    setUseDownsellOffer(false);
    setSelectedModules(availableModules.map((m) => m.id));
  };

  const selectSingleMode = () => {
    setCheckoutError(null);
    const defaultSingle: ReportModuleId = report.mode === 'pair' ? 'zgodnosc' : 'finanse';
    setSelectedModules((prev) =>
      prev.length >= availableModules.length || prev.length === 0 ? [defaultSingle] : prev,
    );
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
      const raw = await res.text();
      let json: {
        ok?: boolean;
        verified?: boolean;
        unlockState?: UnlockState;
        report?: SolarisFullReport | null;
        error?: string;
      } = {};
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = {};
        }
      }
      if (res.ok && json.verified && json.unlockState) {
        let finalReport = json.report ?? undefined;
        let finalUnlock = json.unlockState;
        // Stateless Vercel cold-start enrichment + automatic full-report email delivery
        if (!finalReport || !finalUnlock.emailDeliveredTo) {
          try {
            const deliverRes = await fetch('/api/report/deliver-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: report.sessionId,
                stripeSessionId,
                report: finalReport ?? report,
              }),
            });
            if (deliverRes.ok) {
              const deliverJson = (await deliverRes.json()) as {
                report?: SolarisFullReport;
                deliveredTo?: string | null;
                customerEmail?: string | null;
              };
              if (deliverJson.report) finalReport = deliverJson.report;
              if (deliverJson.deliveredTo || deliverJson.customerEmail) {
                finalUnlock = {
                  ...finalUnlock,
                  emailDeliveredTo: deliverJson.deliveredTo ?? finalUnlock.emailDeliveredTo,
                  customerEmail: deliverJson.customerEmail ?? finalUnlock.customerEmail,
                };
              }
            }
          } catch {
            // keep verified unlock state even if email delivery times out
          }
        }
        trackTikTokCompletePayment({
          eventId: stripeSessionId,
          contentId: finalUnlock.orderId || report.sessionId,
          contentName: finalUnlock.confirmation?.variantLabel
            ? `Solaris 2027 — Raport (${finalUnlock.confirmation.variantLabel})`
            : 'Solaris 2027 — Raport',
          value: parsePlnAmountToNumber(finalUnlock.confirmation?.priceGrossPln),
        });
        onUnlockSuccess(finalUnlock, finalReport);
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

    trackTikTokInitiateCheckout({
      contentId: payload.orderId || report.sessionId,
      contentName:
        report.mode === 'pair'
          ? 'Solaris 2027 — Pakiet Dla Dwojga'
          : 'Solaris 2027 — Raport Solo',
      value: parsePlnAmountToNumber(payload.amountPln),
    });

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

    const trimmedCheckoutEmail = checkoutEmail.trim();
    if (trimmedCheckoutEmail && !isValidEmailAddress(trimmedCheckoutEmail)) {
      setCheckoutError(
        'Wpisz poprawny adres e-mail do wysyłki raportu albo zostaw pole puste i wpisz go w Stripe.',
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
          customerEmail: trimmedCheckoutEmail || undefined,
          termsAndAgeAccepted: true,
          withdrawalWaiverAccepted: true,
          secondPersonConsentAccepted: report.mode === 'pair' ? secondPersonConsentAccepted : false,
          marketingConsent,
        }),
      });
      const rawText = await response.text();
      let json: {
        ok?: boolean;
        requiresRedirect?: boolean;
        checkoutUrl?: string;
        stripeSessionId?: string;
        stripeMode?: string;
        orderId?: string;
        amountPln?: string;
        error?: string;
      } = {};
      if (rawText) {
        try {
          json = JSON.parse(rawText);
        } catch {
          json = {};
        }
      }

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
          previousStripeSessionId: unlockState.lastStripeSessionId || '',
          customerEmail: unlockState.customerEmail || checkoutEmail.trim() || undefined,
          termsAndAgeAccepted: true,
          withdrawalWaiverAccepted: true,
          secondPersonConsentAccepted: report.mode === 'pair' ? upsellSecondPerson : false,
        }),
      });
      const rawText = await response.text();
      let json: {
        ok?: boolean;
        requiresRedirect?: boolean;
        checkoutUrl?: string;
        stripeSessionId?: string;
        stripeMode?: string;
        orderId?: string;
        amountPln?: string;
        error?: string;
      } = {};
      if (rawText) {
        try {
          json = JSON.parse(rawText);
        } catch {
          json = {};
        }
      }
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

  const handleSendReportEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendEmailInput.trim();
    if (!isValidEmailAddress(targetEmail)) {
      setReportEmailStatus({
        type: 'error',
        text: 'Wpisz poprawny adres e-mail, na który mamy wysłać pełny raport.',
      });
      return;
    }
    if (!unlockState.lastStripeSessionId) {
      setReportEmailStatus({
        type: 'error',
        text: 'Brak identyfikatora płatności Stripe do wysyłki. Zapisz raport jako PDF A4 poniżej.',
      });
      return;
    }

    setIsSendingReportEmail(true);
    setReportEmailStatus({ type: 'idle', text: '' });
    try {
      const res = await fetch('/api/report/deliver-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: report.sessionId,
          stripeSessionId: unlockState.lastStripeSessionId,
          recipientEmail: targetEmail,
          report,
          forceResend: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: boolean;
        reason?: string;
        deliveredTo?: string | null;
        error?: string;
      };

      if (res.ok && json.sent) {
        const masked = json.deliveredTo || targetEmail;
        onUnlockSuccess({
          ...unlockState,
          customerEmail: targetEmail,
          emailDeliveredTo: masked,
        });
        setReportEmailStatus({
          type: 'ok',
          text: `Pełny raport wysłany na ${masked}. Sprawdź skrzynkę (oraz folder Oferty / Spam).`,
        });
      } else if (json.reason === 'not_configured') {
        setReportEmailStatus({
          type: 'error',
          text: 'Wysyłka e-mail nie jest jeszcze skonfigurowana na serwerze. Zapisz raport przyciskiem „Drukuj / PDF A4” poniżej.',
        });
      } else {
        setReportEmailStatus({
          type: 'error',
          text: json.error || 'Nie udało się wysłać e-maila. Spróbuj ponownie za chwilę.',
        });
      }
    } catch {
      setReportEmailStatus({
        type: 'error',
        text: 'Chwilowy problem z połączeniem. Spróbuj ponownie za minutę lub pobierz PDF A4.',
      });
    } finally {
      setIsSendingReportEmail(false);
    }
  };

  const activeMonth = report.monthlyTimeline[selectedMonthIdx] ?? report.monthlyTimeline[0];
  const isMonthDetailOpen = hasAnyPurchase || activeMonth.monthIndex === peakMonthIdx;

  const filteredCalendarEvents = useMemo(() => {
    if (calendarFilter === 'all') return report.calendarEvents;
    return report.calendarEvents.filter((ev) => ev.type === calendarFilter);
  }, [report.calendarEvents, calendarFilter]);

  const checkoutSectionElement = !allUnlocked ? (
    <ReportCheckoutSection
      report={report}
      availableModules={availableModules}
      lockedModules={lockedModules}
      selectedModules={selectedModules}
      pricing={pricing}
      includeCalendarBump={includeCalendarBump}
      hasRetentionDiscount={hasRetentionDiscount}
      useDownsellOffer={useDownsellOffer}
      downsellSecondsLeft={downsellSecondsLeft}
      termsAndAgeAccepted={termsAndAgeAccepted}
      waiverAccepted={waiverAccepted}
      secondPersonConsentAccepted={secondPersonConsentAccepted}
      marketingConsent={marketingConsent}
      checkoutEmail={checkoutEmail}
      checkoutError={checkoutError}
      isPaying={isPaying}
      onChangeCheckoutEmail={(val) => {
        setCheckoutEmail(val);
        if (checkoutError) setCheckoutError(null);
      }}
      onSelectFullBundle={selectFullBundle}
      onSelectSingleMode={selectSingleMode}
      onToggleModule={toggleModule}
      onFocusModuleFromPreview={focusModuleInPaywall}
      onToggleCalendarBump={setIncludeCalendarBump}
      onToggleTermsAndAge={(checked) => {
        setTermsAndAgeAccepted(checked);
        if (checkoutError) setCheckoutError(null);
      }}
      onToggleWaiver={(checked) => {
        setWaiverAccepted(checked);
        if (checkoutError) setCheckoutError(null);
      }}
      onToggleSecondPerson={(checked) => {
        setSecondPersonConsentAccepted(checked);
        if (checkoutError) setCheckoutError(null);
      }}
      onToggleMarketing={setMarketingConsent}
      onCheckout={handleCheckout}
      onOpenLegal={onOpenLegal}
      onOpenExitRescue={() => setShowExitRescueModal(true)}
    />
  ) : null;

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-6 sm:px-6 sm:pt-9">
      {/* Stripe Return Status Notice (verified / cancelled / verifying) */}
      {paymentNotice && (
        <div
          role={paymentNotice.type === 'error' ? 'alert' : 'status'}
          className={`no-print mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-xs leading-relaxed ${
            paymentNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : paymentNotice.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-zinc-200 bg-white text-[#111114]'
          }`}
        >
          <span>{paymentNotice.text}</span>
          {onDismissPaymentNotice && (
            <button
              type="button"
              onClick={onDismissPaymentNotice}
              aria-label="Zamknij komunikat"
              className="shrink-0 rounded-full p-1 text-zinc-500 transition-colors hover:bg-black/5 hover:text-[#111114]"
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
          className="no-print mb-6 rounded-[24px] border border-[#E84A27]/35 bg-[#FFF8F6] p-5 text-sm text-[#111114] shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#E84A27]">
                Sesja Stripe gotowa · Zamówienie {pendingStripeCheckout.orderId}
              </p>
              <h2 className="font-display text-base font-semibold text-[#111114]">
                Dokończ bezpieczną płatność {pendingStripeCheckout.amountPln} w Stripe
              </h2>
              <p className="text-xs leading-relaxed text-zinc-600">
                Po opłaceniu zamówienia w oknie Stripe wróć tutaj — raport odblokuje się automatycznie po weryfikacji po stronie serwera.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={pendingStripeCheckout.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#D43E1D]"
              >
                <span>Otwórz płatność Stripe ({pendingStripeCheckout.amountPln})</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                disabled={checkingPayment}
                onClick={() => void verifyPendingStripePayment(pendingStripeCheckout.stripeSessionId)}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#111114] transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
              >
                {checkingPayment ? 'Sprawdzam...' : 'Sprawdź status płatności'}
              </button>
            </div>
          </div>

          {pendingStatusMsg && (
            <p className="mt-3 text-xs font-medium text-[#C83717]">{pendingStatusMsg}</p>
          )}
        </div>
      )}

      {/* DURABLE POST-PURCHASE ORDER CONFIRMATION (Trwały nośnik) */}
      {hasAnyPurchase && unlockState.confirmation && (
        <section
          aria-label="Potwierdzenie zamówienia na trwałym nośniku"
          className="print-card mb-6 rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-950 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-200/80 pb-3.5">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-emerald-700">
                Potwierdzenie zamówienia (trwały nośnik) · Nr {unlockState.confirmation.orderId}
              </p>
              <h2 className="font-display mt-1 text-base font-semibold text-[#111114] sm:text-lg">
                {unlockState.confirmation.subject}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCopyConfirmation}
              className="no-print inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-emerald-900 transition-colors hover:bg-emerald-100/60"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{copiedConfirmation ? 'Skopiowano' : 'Kopiuj potwierdzenie'}</span>
            </button>
          </div>

          <dl className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-medium text-emerald-800/80">Produkt</dt>
              <dd className="mt-0.5 font-semibold text-[#111114]">
                Raport Solaris 2027 ({unlockState.confirmation.variantLabel})
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium text-emerald-800/80">Cena brutto</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#111114]">
                {unlockState.confirmation.priceGrossPln}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium text-emerald-800/80">Data zamówienia</dt>
              <dd className="mt-0.5 font-mono text-[#111114]">{unlockState.confirmation.orderedAtPl}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium text-emerald-800/80">Link do Raportu</dt>
              <dd className="mt-0.5 truncate font-mono text-[11px] text-emerald-800">
                {unlockState.confirmation.reportUrl}
              </dd>
            </div>
          </dl>

          {/* Full-report email delivery status + manual send/resend bar */}
          {unlockState.lastStripeSessionId && (
            <div className="no-print mt-4 rounded-2xl border border-emerald-200 bg-white p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  {unlockState.emailDeliveredTo ? (
                    <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-semibold text-[#111114]">
                      {unlockState.emailDeliveredTo
                        ? `Pełny raport wysłany na ${unlockState.emailDeliveredTo}`
                        : 'Wyślij pełny raport prosto na swój e-mail'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">
                      Wiadomość zawiera cały odblokowany raport, harmonogram 12 miesięcy
                      {unlockState.calendarUnlocked ? ' oraz załącznik kalendarza .ics.' : '.'}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSendReportEmail}
                  noValidate
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <label htmlFor="resend-report-email" className="sr-only">
                    Adres e-mail do wysyłki raportu
                  </label>
                  <input
                    id="resend-report-email"
                    type="email"
                    placeholder="twoj@email.pl"
                    value={resendEmailInput}
                    onChange={(e) => {
                      setResendEmailInput(e.target.value);
                      if (reportEmailStatus.type !== 'idle') {
                        setReportEmailStatus({ type: 'idle', text: '' });
                      }
                    }}
                    className="min-h-[38px] w-full rounded-lg border border-zinc-300 bg-[#FAFAFA] px-3.5 text-xs text-[#111114] placeholder:text-zinc-400 focus:border-[#E84A27] focus:bg-white focus:outline-none sm:w-52"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReportEmail}
                    className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-lg bg-[#111114] px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isSendingReportEmail
                      ? 'Wysyłanie...'
                      : unlockState.emailDeliveredTo
                        ? 'Wyślij ponownie'
                        : 'Wyślij na e-mail'}
                  </button>
                </form>
              </div>

              {reportEmailStatus.type !== 'idle' && (
                <p
                  role={reportEmailStatus.type === 'error' ? 'alert' : 'status'}
                  className={`mt-2.5 text-[11px] font-medium ${
                    reportEmailStatus.type === 'ok' ? 'text-emerald-700' : 'text-[#C83717]'
                  }`}
                >
                  {reportEmailStatus.text}
                </p>
              )}
            </div>
          )}

          <ul className="mt-3.5 space-y-1.5 border-t border-emerald-200/80 pt-3 text-[11px] leading-relaxed text-emerald-900/85">
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
                className="underline hover:text-[#111114]"
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
                className="underline hover:text-[#111114]"
              >
                Polityka prywatności
              </a>
              . Wsparcie i reklamacje: {unlockState.confirmation.contactEmail}.
            </li>
          </ul>
        </section>
      )}

      {/* POST-PURCHASE 15-MINUTE UPSELL CARD (Partial buyers only) */}
      {hasAnyPurchase && !allUnlocked && upsellSecondsLeft > 0 && (
        <PostPurchaseUpsellCard
          mode={report.mode}
          lockedModules={lockedModules}
          upsellSecondsLeft={upsellSecondsLeft}
          upsellTermsAccepted={upsellTermsAccepted}
          upsellWaiver={upsellWaiver}
          upsellSecondPerson={upsellSecondPerson}
          upsellError={upsellError}
          isPaying={isPaying}
          onToggleTerms={(checked) => {
            setUpsellTermsAccepted(checked);
            if (upsellError) setUpsellError(null);
          }}
          onToggleWaiver={(checked) => {
            setUpsellWaiver(checked);
            if (upsellError) setUpsellError(null);
          }}
          onToggleSecondPerson={(checked) => {
            setUpsellSecondPerson(checked);
            if (upsellError) setUpsellError(null);
          }}
          onUpsell={handleUpsellRemaining}
          onOpenLegal={onOpenLegal}
        />
      )}

      {/* TOP EPHEMERIS EXECUTIVE HEADER (Free Layer + Report Top Disclaimer + Honest Unknown-Time Note) */}
      <section className="print-card rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-8">
        <div className="mb-4 rounded-xl border border-zinc-200/80 bg-[#FAFAFA] px-3.5 py-2.5 text-[11px] leading-relaxed text-zinc-500">
          {LEGAL_TEXTS.reportTopBottomDisclaimer}
        </div>

        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-xs font-medium tabular-nums text-[#E84A27]">
              Solariusz 2027 · {report.ephemeris.solarReturnDisplayPl} · {report.ephemeris.cityResolved} ({report.ephemeris.timeZoneUsed})
            </p>
            <h1 className="font-display mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-[#111114] sm:text-3xl">
              {report.freeCoreVectorTitle}
            </h1>
            <p className="print-muted mt-2.5 max-w-3xl text-sm leading-relaxed text-zinc-600">
              {report.freeCoreVectorBody}
            </p>

            {/* Honest unknown birth time note (P0.3) */}
            {report.ephemeris.omittedTimeDependentElements && report.ephemeris.unknownTimeNotePl && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs text-zinc-700">
                <Info className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
                <span>{report.ephemeris.unknownTimeNotePl}</span>
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 no-print">
            {unlockState.calendarUnlocked && (
              <button
                type="button"
                onClick={() => triggerIcsDownload(report.person1.name, report.calendarEvents)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#111114] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kalendarz .ics (12 dat)</span>
              </button>
            )}
            {unlockState.pdfUnlocked && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-[#111114] transition-colors hover:border-zinc-400 hover:bg-zinc-50"
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
            <dt className="print-muted text-[11px] text-zinc-500">Słońce natalne</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[#111114]">
              {report.ephemeris.natalSunDeg}° {report.ephemeris.natalSunSignPl}
            </dd>
          </div>
          <div>
            <dt className="print-muted text-[11px] text-zinc-500">Jowisz / Saturn 2027</dt>
            <dd className="mt-0.5 text-sm font-semibold text-[#111114]">
              {report.ephemeris.jupiterSignPl} · {report.ephemeris.saturnSignPl}
            </dd>
          </div>
          <div>
            <dt className="print-muted text-[11px] text-zinc-500">Miesiąc wzrostu</dt>
            <dd className="mt-0.5 text-sm font-semibold text-emerald-700">{report.peakMonthPl}</dd>
          </div>
          <div>
            <dt className="print-muted text-[11px] text-zinc-500">Miesiąc tarcia</dt>
            <dd className="mt-0.5 text-sm font-semibold text-[#E84A27]">{report.riskMonthPl}</dd>
          </div>
        </dl>
      </section>

      {/* FOR UNPAID USERS: SIMPLE CHECKOUT RIGHT UNDER THE RESULT (NO SCROLLING HALF THE SITE!) */}
      {!hasAnyPurchase && checkoutSectionElement}

      {!hasAnyPurchase && (
        <div className="mt-8 mb-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
            Bezpłatny podgląd Twojego 2027
          </p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
      )}

      {/* 4-CARD PERSONALIZED VISUAL DASHBOARD WITH REAL USER DATA */}
      <ReportVisualBento
        report={report}
        unlockedModules={unlockState.unlockedModules}
        calendarUnlocked={unlockState.calendarUnlocked}
        onFocusModulePaywall={focusModuleInPaywall}
      />

      {/* FREE DIAGNOSTIC BRIEF: Open Insight + Behavioral Synthesis + 4 Planetary Signals */}
      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Open Start Analysis + Behavioral Profile vs 2027 */}
        <article className="print-card flex flex-col justify-between rounded-[22px] border border-zinc-200 bg-white p-5 text-[#111114] sm:p-6 lg:col-span-7">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
              Bezpłatna diagnoza Solariusza i profilu (0 zł)
            </p>
            <h2 className="font-display mt-1.5 text-xl font-semibold leading-snug text-[#111114]">
              {report.freeOpenInsightTitle}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
              {report.freeOpenInsightBody}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200/80 bg-[#FAFAFA] p-3.5">
              <p className="text-xs font-semibold text-[#111114]">
                {report.behavioralSynthesis.strengthTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
                {report.behavioralSynthesis.strengthText}
              </p>
            </div>
            <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-3.5">
              <p className="text-xs font-semibold text-[#C83717]">
                {report.behavioralSynthesis.blindSpotTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-700">
                {report.behavioralSynthesis.blindSpotText}
              </p>
            </div>
          </div>
        </article>

        {/* Right: Pair Compatibility Card (if Pair) OR 4 Planetary Signals Decoder */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {report.mode === 'pair' && report.compatibilityScore !== null && (
            <article className="print-card rounded-[22px] border border-[#E84A27]/25 bg-[#FFF8F6] p-5 text-[#111114] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E84A27]">
                    Bezpłatny wynik zgodności 2027
                  </p>
                  <h2 className="font-display mt-1 text-lg font-semibold leading-snug text-[#111114]">
                    {report.compatibilityHeadline}
                  </h2>
                </div>
                <span className="font-mono shrink-0 rounded-lg bg-[#111114] px-3 py-1 text-sm font-bold tabular-nums text-white">
                  {report.compatibilityScore}%
                </span>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-zinc-700 sm:text-sm">
                {report.compatibilityFreeInsight}
              </p>
              {report.compatibilityBreakdown && (
                <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700">
                  <strong className="text-[#111114]">Punkt testu:</strong>{' '}
                  {report.compatibilityBreakdown.frictionTrigger}
                </p>
              )}
            </article>
          )}

          {/* 4 Concrete Planetary Takeaways from 2027 Solar Return */}
          <article className="print-card flex-1 rounded-[22px] border border-zinc-200 bg-white p-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
              Co oznaczają Twoje planety w 2027
            </p>
            <div className="mt-3 space-y-3">
              {report.planetarySignals.map((sig) => (
                <div
                  key={sig.planetPl}
                  className="border-b border-zinc-100 pb-2.5 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#111114]">
                      {sig.planetPl} · {sig.signPl}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">{sig.domainPl}</span>
                  </div>
                  <p className="print-muted mt-1 text-xs leading-relaxed text-zinc-600">
                    {sig.practicalTakeaway}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* INTERACTIVE 12-MONTH TIMELINE (Jan–Dec 2027 with concrete transit + free hook + unlocked checklist) */}
      <section className="print-card mt-5 rounded-[24px] border border-zinc-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#111114] sm:text-xl">
              Oś 12 miesięcy 2027: Styczeń – Grudzień
            </h2>
            <p className="print-muted mt-1 text-xs text-zinc-500">
              Kliknij miesiąc, aby sprawdzić poziom energii, ryzyka i konkretny sygnał tranzytowy.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#111114]" />
              Energia
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#E84A27]">
              <span className="h-2 w-2 rounded-sm bg-[#E84A27]" />
              Ryzyko
            </span>
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
                className={`flex flex-col items-center rounded-xl border p-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] ${
                  isSelected
                    ? 'border-[#111114] bg-zinc-100'
                    : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
                }`}
              >
                <div className="flex h-20 w-full items-end justify-center gap-1">
                  <span
                    style={{ height: `${pt.energy}%` }}
                    className="w-2 rounded-t-sm bg-[#111114]"
                  />
                  <span
                    style={{ height: `${pt.risk}%` }}
                    className="w-2 rounded-t-sm bg-[#E84A27]"
                  />
                </div>
                <span className="mt-2 font-mono text-[10px] font-semibold text-[#111114]">
                  {pt.monthShort}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[#E84A27]">
                {activeMonth.transitLabel}
              </span>
              <h3 className="font-display mt-0.5 text-base font-semibold text-[#111114] sm:text-lg">
                {activeMonth.monthFull}: {activeMonth.headline}
              </h3>
            </div>
            <span className="font-mono rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-medium tabular-nums text-zinc-700">
              Energia {activeMonth.energy}% · Ryzyko {activeMonth.risk}%
            </span>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-zinc-700">
            {activeMonth.freeHook}
          </p>

          {isMonthDetailOpen ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs leading-relaxed text-emerald-950 sm:text-sm">
              <strong className="font-semibold text-emerald-800">
                {hasAnyPurchase ? 'Plan działania na ten miesiąc: ' : 'Otwarta wskazówka dla Twojego szczytu: '}
              </strong>
              {activeMonth.actionNote}
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 sm:flex-row sm:items-center">
              <p className="text-xs leading-relaxed text-zinc-600">
                Szczegółowa checklista decyzji oraz dokładne dni podwyższonego ryzyka dla{' '}
                <strong className="text-[#111114]">{activeMonth.monthFull}</strong> otwierają się po
                odblokowaniu raportu.
              </p>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('modular-paywall')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="no-print shrink-0 rounded-lg bg-[#111114] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
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
              <h2 className="font-display text-xl font-semibold text-[#111114] sm:text-2xl">
                Twoje pełne analizy 2027 ({unlockState.unlockedModules.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Strategia, konkretne kroki, czerwone flagi i benchmarki kontrolne dla wybranych sfer.
              </p>
            </div>
            {unlockState.orderId && (
              <span className="font-mono text-xs text-zinc-500">
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
                  className="print-card rounded-[24px] border border-emerald-200 bg-white p-5 sm:p-7"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-700">
                        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Odblokowano · Potencjał {content.scoreOutOf10}/10</span>
                      </span>
                      <h3 className="font-display mt-1 text-xl font-semibold text-[#111114] sm:text-2xl">
                        {content.title}
                      </h3>
                    </div>
                    <span className="font-mono rounded-lg border border-zinc-200 bg-[#FAFAFA] px-3 py-1 text-xs font-medium text-zinc-700">
                      {content.watchDates}
                    </span>
                  </div>

                  {/* Two deep editorial paragraphs */}
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm leading-relaxed text-zinc-700 md:grid-cols-2">
                    <p className="print-muted">{content.summary}</p>
                    <p className="print-muted">{content.deepDive}</p>
                  </div>

                  {/* 2-Column Tactical Matrix: Rób to vs Czerwone flagi */}
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <Target className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Rób to w 2027 (3 konkretne ruchy)</span>
                      </p>
                      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-zinc-800">
                        {content.keyActions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C83717]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Czerwone flagi — tego unikaj</span>
                      </p>
                      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-zinc-800">
                        {content.avoidList.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E84A27]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Mid-year Concrete Benchmark */}
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-[#FAFAFA] px-4 py-3 text-xs text-zinc-700">
                    <strong className="text-[#111114]">Punkt kontrolny: </strong>
                    {content.checkpoint}
                  </div>
                </article>
              );
            })}
          </div>

          {/* FULL 12-WINDOW FILTERABLE CALENDAR + .ICS DOWNLOAD */}
          {unlockState.calendarUnlocked && (
            <div className="print-card rounded-[24px] border border-zinc-200 bg-white p-5 text-[#111114] sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#111114] sm:text-2xl">
                    Kalendarz Złotych i Ryzykownych Dat 2027 (wszystkie 12 okien)
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
                    Dodaj jednym kliknięciem do Apple Calendar lub Google Calendar — każde okno ma gotowy opis działania.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerIcsDownload(report.person1.name, report.calendarEvents)}
                  className="no-print inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#111114] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
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
                    className={`min-h-[34px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      calendarFilter === tab.id
                        ? 'bg-[#111114] text-white'
                        : 'border border-zinc-200 bg-[#FAFAFA] text-zinc-700 hover:bg-zinc-100'
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
                    className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-[#FAFAFA] p-3.5 text-xs text-[#111114]"
                  >
                    <div>
                      <p
                        className={`font-mono text-[10px] font-semibold uppercase ${
                          ev.type === 'golden' ? 'text-emerald-700' : 'text-[#C83717]'
                        }`}
                      >
                        {ev.dateStart} → {ev.dateEnd} ·{' '}
                        {ev.type === 'golden' ? 'Złote okno' : 'Ostrożność'}
                      </p>
                      <p className="mt-1 font-semibold leading-snug">{ev.title}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-zinc-600">
                      {ev.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* FOR PARTIAL BUYERS: CHECKOUT FOR REMAINING MODULES AT BOTTOM */}
      {hasAnyPurchase && !allUnlocked && checkoutSectionElement}

      {/* Report Bottom Disclaimer + Quiet Footer Action */}
      <footer className="mt-8 space-y-4 border-t border-zinc-200 pt-6 text-center">
        <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-zinc-500">
          {LEGAL_TEXTS.reportTopBottomDisclaimer}
        </p>
        <div className="no-print flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-600">
          <button
            type="button"
            onClick={onStartFresh}
            className="min-h-[42px] font-medium underline decoration-zinc-300 underline-offset-4 hover:text-[#111114]"
          >
            Oblicz nową matrycę dla innej daty lub osoby
          </button>
          <a
            href="/regulamin"
            onClick={(e) => {
              e.preventDefault();
              onOpenLegal('regulamin');
            }}
            className="hover:text-[#111114]"
          >
            Regulamin
          </a>
          <a
            href="/polityka-prywatnosci"
            onClick={(e) => {
              e.preventDefault();
              onOpenLegal('polityka');
            }}
            className="hover:text-[#111114]"
          >
            Polityka prywatności
          </a>
        </div>
      </footer>

      {/* MOBILE-FIRST COMPACT STICKY RECOVERY BAR (<= 7% mobile height, unpaid users only) */}
      {!hasAnyPurchase && !showExitRescueModal && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md sm:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#111114]">
                Alert na {report.riskMonthPl} zablokowany
              </p>
              <p className="font-mono text-[11px] text-zinc-500">
                Od {useDownsellOffer ? '9,99 zł' : '14,99 zł'} · BLIK
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                document.getElementById('checkout-panel')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl bg-[#E84A27] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D43E1D]"
            >
              Odblokuj
            </button>
          </div>
        </div>
      )}

      {/* NON-BUYER RETENTION RESCUE SHEET: Downsell 9,99 zł OR Email Follow-Up + -20% */}
      {showExitRescueModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zanim wyjdziesz — oferta na start lub przypomnienie e-mail"
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setShowExitRescueModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-zinc-200 bg-white p-5 text-[#111114] shadow-2xl sm:rounded-[24px] sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#E84A27]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>WAŻNE PRZEZ {formatTimer(downsellSecondsLeft)}</span>
                </p>
                <h3 className="font-display mt-1.5 text-xl font-semibold text-[#111114] sm:text-2xl">
                  Nie musisz od razu brać całego pakietu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExitRescueModal(false)}
                aria-label="Zamknij okno"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-[#111114]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Option 1: 9,99 zł Single-Module Downsell */}
            <div className="mt-5 rounded-2xl border border-[#E84A27]/35 bg-[#FFF8F6] p-4">
              <p className="text-xs font-semibold text-[#E84A27]">Opcja 1 · Test na start</p>
              <h4 className="font-display mt-1 text-base font-semibold text-[#111114]">
                Odblokuj 1 najpilniejszy moduł + 3 krytyczne daty za{' '}
                <span className="font-mono text-emerald-700">9,99 zł</span>{' '}
                <span className="font-mono text-xs font-normal text-zinc-400 line-through">
                  14,99 zł
                </span>
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
                Sprawdź jakość analizy na jednym obszarze (np. {report.mode === 'pair' ? 'Zgodność' : 'Finanse i Kariera'}) zanim zdecydujesz o reszcie roku.
              </p>
              <button
                type="button"
                onClick={handleActivateDownsell}
                className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#E84A27] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#D43E1D]"
              >
                Aktywuj ofertę startową 9,99 zł
              </button>
            </div>

            {/* Option 2: Email Follow-up + -20% Discount */}
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-4">
              <p className="text-xs font-semibold text-zinc-500">Opcja 2 · Zapisz na później</p>
              <h4 className="font-display mt-1 text-base font-semibold text-[#111114]">
                Wyślij bezpłatny skrót + rabat -20% na e-mail
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
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
                    className="min-h-[44px] flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-[#111114] placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[#111114] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    Zapisz i odbierz -20%
                  </button>
                </div>

                {/* Unchecked separate marketing consent checkbox (P1.11) */}
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-zinc-600">
                  <input
                    type="checkbox"
                    checked={rescueMarketingConsent}
                    onChange={(e) => {
                      setRescueMarketingConsent(e.target.checked);
                      if (rescueStatus.type === 'error') {
                        setRescueStatus({ type: 'idle', text: '' });
                      }
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#E84A27]"
                  />
                  <span>
                    {LEGAL_TEXTS.checkbox4Marketing} Szczegóły w{' '}
                    <a
                      href="/polityka-prywatnosci"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenLegal('polityka');
                      }}
                      className="underline hover:text-[#111114]"
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
                  className={`mt-2 text-xs font-medium ${
                    rescueStatus.type === 'ok' ? 'text-emerald-700' : 'text-[#C83717]'
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
