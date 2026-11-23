import {
  ArrowRight,
  Check,
  Clock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import type { SolarisFullReport } from '../utils/ephemerisEngine';
import {
  formatPlnFromGrosze,
  ORDER_BUMP_CALENDAR_GROSZE,
  POST_PURCHASE_UPSELL_GROSZE,
  type ModuleDefinition,
  type PricingSummary,
  type ReportModuleId,
} from '../utils/solarisPricing';
import { LEGAL_TEXTS, type LegalDocId } from '../data/legalDocuments';

function formatTimer(secondsLeft: number): string {
  const safe = Math.max(0, secondsLeft);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface ReportCheckoutSectionProps {
  report: SolarisFullReport;
  availableModules: ModuleDefinition[];
  lockedModules: ModuleDefinition[];
  selectedModules: ReportModuleId[];
  pricing: PricingSummary;
  includeCalendarBump: boolean;
  hasRetentionDiscount: boolean;
  useDownsellOffer: boolean;
  downsellSecondsLeft: number;
  termsAndAgeAccepted: boolean;
  waiverAccepted: boolean;
  secondPersonConsentAccepted: boolean;
  marketingConsent: boolean;
  checkoutEmail: string;
  checkoutError: string | null;
  isPaying: boolean;
  onChangeCheckoutEmail: (value: string) => void;
  onSelectFullBundle: () => void;
  onSelectSingleMode: () => void;
  onToggleModule: (id: ReportModuleId) => void;
  onFocusModuleFromPreview: (id: ReportModuleId) => void;
  onToggleCalendarBump: (checked: boolean) => void;
  onToggleTermsAndAge: (checked: boolean) => void;
  onToggleWaiver: (checked: boolean) => void;
  onToggleSecondPerson: (checked: boolean) => void;
  onToggleMarketing: (checked: boolean) => void;
  onCheckout: () => void;
  onOpenLegal: (doc: LegalDocId) => void;
  onOpenExitRescue: () => void;
}

export function ReportCheckoutSection({
  report,
  availableModules,
  lockedModules,
  selectedModules,
  pricing,
  includeCalendarBump,
  hasRetentionDiscount,
  useDownsellOffer,
  downsellSecondsLeft,
  termsAndAgeAccepted,
  waiverAccepted,
  secondPersonConsentAccepted,
  checkoutEmail,
  checkoutError,
  isPaying,
  onChangeCheckoutEmail,
  onSelectFullBundle,
  onSelectSingleMode,
  onToggleModule,
  onToggleCalendarBump,
  onToggleTermsAndAge,
  onToggleWaiver,
  onToggleSecondPerson,
  onCheckout,
  onOpenLegal,
  onOpenExitRescue,
}: ReportCheckoutSectionProps) {
  const isFullSelected = pricing.isFullBundle && !useDownsellOffer;
  const fullPackageRegularGrosze = availableModules.length * 1499 + ORDER_BUMP_CALENDAR_GROSZE;
  const fullPackagePriceGrosze = hasRetentionDiscount ? 3599 : 4499;

  return (
    <section
      id="modular-paywall"
      aria-label="Odblokuj pełny raport Solaris 2027"
      className="no-print mt-5"
    >
      <div
        id="checkout-panel"
        className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_34px_rgba(17,17,20,0.05)] sm:p-7"
      >
        {/* Clean, Scannable Header */}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-[#111114] sm:text-2xl">
              Odblokuj dokładne daty i plan na 2027
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Jednorazowa płatność · Bez subskrypcji · Natychmiastowy dostęp na stronie i na e-mail
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-200 bg-[#FAFAFA] px-2.5 py-1 text-[11px] font-medium text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            BLIK · Apple Pay · Karta
          </span>
        </div>

        {/* Active Promo Banner (only if triggered) */}
        {useDownsellOffer && downsellSecondsLeft > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-950">
            <span>
              Oferta startowa aktywna: <strong>1 obszar + 3 daty za 9,99 zł</strong>
            </span>
            <span className="font-mono font-semibold tabular-nums text-[#C83717]">
              {formatTimer(downsellSecondsLeft)}
            </span>
          </div>
        )}

        {hasRetentionDiscount && !useDownsellOffer && (
          <div className="mt-4 rounded-xl border border-[#E84A27]/30 bg-[#FFF5F2] px-3.5 py-2.5 text-xs text-[#111114]">
            Aktywny rabat <strong className="text-[#E84A27]">-20%</strong> na Pełny Raport:{' '}
            <strong className="font-mono tabular-nums">35,99 zł</strong> zamiast 44,99 zł.
          </div>
        )}

        {/* STEP 1: Simple 2-Choice Plan Picker (Side-by-Side) */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Choice 1: Full Bundle (Recommended) */}
          <button
            type="button"
            onClick={onSelectFullBundle}
            aria-pressed={isFullSelected}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] sm:p-5 ${
              isFullSelected
                ? 'border-[#E84A27] bg-[#FFF8F6] ring-1 ring-[#E84A27]'
                : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      isFullSelected
                        ? 'border-[#E84A27] bg-[#E84A27] text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isFullSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-[#E84A27]">
                    Najlepszy wybór
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-[11px] tabular-nums text-zinc-400 line-through">
                    {formatPlnFromGrosze(fullPackageRegularGrosze)}
                  </span>
                  <span className="font-mono text-xl font-bold tabular-nums text-[#111114]">
                    {formatPlnFromGrosze(fullPackagePriceGrosze)}
                  </span>
                </div>
              </div>

              <h3 className="font-display mt-2 text-base font-semibold text-[#111114] sm:text-lg">
                Pełny Raport 2027
              </h3>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-zinc-700">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>Wszystkie {availableModules.length} sfery + plan na 12 miesięcy</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>
                  Kalendarz 12 dat (.ics) + PDF A4 — <strong className="text-[#111114]">GRATIS</strong>
                </span>
              </li>
            </ul>
          </button>

          {/* Choice 2: Single / Custom Areas */}
          <button
            type="button"
            onClick={onSelectSingleMode}
            aria-pressed={!isFullSelected}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111114] sm:p-5 ${
              !isFullSelected
                ? 'border-[#111114] bg-white ring-1 ring-[#111114]'
                : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      !isFullSelected
                        ? 'border-[#111114] bg-[#111114] text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {!isFullSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-zinc-500">
                    Na start
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-[11px] text-zinc-400">1–3 obszary</span>
                  <span className="font-mono text-xl font-bold tabular-nums text-[#111114]">
                    od {useDownsellOffer ? '9,99 zł' : '14,99 zł'}
                  </span>
                </div>
              </div>

              <h3 className="font-display mt-2 text-base font-semibold text-[#111114] sm:text-lg">
                Wybrane obszary
              </h3>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-zinc-600">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
                <span>Zaznaczasz tylko to, czego potrzebujesz</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
                <span>1: {useDownsellOffer ? '9,99' : '14,99'} zł · 2: 24,99 zł · 3: 32,99 zł</span>
              </li>
            </ul>
          </button>
        </div>

        {/* Compact Module Selector (ONLY visible when "Wybrane obszary" is selected) */}
        {!isFullSelected && (
          <div className="mt-3.5 rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-3.5 sm:p-4">
            <p className="text-xs font-semibold text-[#111114]">
              Zaznacz obszary do odblokowania:
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {lockedModules.map((mod) => {
                const checked = selectedModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex min-h-[46px] cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-xs transition-colors ${
                      checked
                        ? 'border-[#111114] bg-white font-semibold text-[#111114]'
                        : 'border-zinc-200 bg-white/60 text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleModule(mod.id)}
                        className="h-4 w-4 shrink-0 accent-[#E84A27]"
                      />
                      <span>{mod.title}</span>
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {report.modules[mod.id]?.scoreOutOf10}/10
                    </span>
                  </label>
                );
              })}
            </div>

            {pricing.moduleCount > 0 && (
              <label
                className={`mt-2.5 flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition-colors ${
                  includeCalendarBump
                    ? 'border-[#E84A27] bg-[#FFF5F2] text-[#111114]'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={includeCalendarBump}
                    onChange={(e) => onToggleCalendarBump(e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[#E84A27]"
                  />
                  <span>Dodaj kalendarz 12 kluczowych dat (.ics do telefonu)</span>
                </span>
                <span className="font-mono shrink-0 font-semibold text-[#111114]">+9,99 zł</span>
              </label>
            )}
          </div>
        )}

        {/* STEP 2: Single Compact Action Area (Email + 2 Short Checkboxes + Pay Button) */}
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-4 sm:p-5">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            {/* Left: Email + Required Legal Checkboxes */}
            <div className="space-y-3 lg:col-span-7">
              <div>
                <label
                  htmlFor="checkout-delivery-email"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-700"
                >
                  <Mail className="h-3.5 w-3.5 text-[#E84A27]" aria-hidden="true" />
                  <span>E-mail do wysyłki raportu (opcjonalnie)</span>
                </label>
                <input
                  id="checkout-delivery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="twoj@email.pl"
                  value={checkoutEmail}
                  onChange={(e) => onChangeCheckoutEmail(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-[#111114] placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-0.5 text-[11px] leading-snug text-zinc-600">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={termsAndAgeAccepted}
                    onChange={(e) => onToggleTermsAndAge(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                  />
                  <span>
                    <strong className="text-[#E84A27]">*</strong> Mam 18 lat i akceptuję{' '}
                    <a
                      href="/regulamin"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenLegal('regulamin');
                      }}
                      className="font-medium text-[#111114] underline hover:text-[#E84A27]"
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
                      className="font-medium text-[#111114] underline hover:text-[#E84A27]"
                    >
                      Politykę prywatności
                    </a>
                    .
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={waiverAccepted}
                    onChange={(e) => onToggleWaiver(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                  />
                  <span>
                    <strong className="text-[#E84A27]">*</strong> {LEGAL_TEXTS.checkbox2Withdrawal}
                  </span>
                </label>

                {report.mode === 'pair' && (
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={secondPersonConsentAccepted}
                      onChange={(e) => onToggleSecondPerson(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                    />
                    <span>
                      <strong className="text-[#E84A27]">*</strong> {LEGAL_TEXTS.checkbox3SecondPerson}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Right: Final Total + Primary Pay CTA */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 lg:col-span-5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-zinc-600">Razem brutto</p>
                  <p className="text-[11px] text-zinc-400">
                    {pricing.isFullBundle
                      ? 'Pełny pakiet + .ics + PDF'
                      : `${pricing.moduleCount} ${pricing.moduleCount === 1 ? 'obszar' : 'obszary'}${includeCalendarBump ? ' + .ics' : ''}`}
                  </p>
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums text-[#111114]">
                  {pricing.formattedFinalPln}
                </p>
              </div>

              {checkoutError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                >
                  {checkoutError}
                </p>
              )}

              <button
                type="button"
                disabled={isPaying || pricing.moduleCount === 0}
                onClick={onCheckout}
                className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#D43E1D] disabled:opacity-50"
              >
                <span>
                  {isPaying
                    ? 'Przekierowanie do Stripe...'
                    : `Zamawiam i płacę ${pricing.formattedFinalPln}`}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="mt-2.5 text-center text-[10px] leading-relaxed text-zinc-500">
                Płatność jednorazowa przez Stripe (BLIK, Apple Pay, karta). Po opłaceniu raport otworzy się od razu.
              </p>

              <button
                type="button"
                onClick={onOpenExitRescue}
                className="mt-2.5 text-center text-[11px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-[#111114]"
              >
                Nie teraz? Zapisz skrót i odbierz -20%
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export interface PostPurchaseUpsellProps {
  mode: SolarisFullReport['mode'];
  lockedModules: ModuleDefinition[];
  upsellSecondsLeft: number;
  upsellTermsAccepted: boolean;
  upsellWaiver: boolean;
  upsellSecondPerson: boolean;
  upsellError: string | null;
  isPaying: boolean;
  onToggleTerms: (checked: boolean) => void;
  onToggleWaiver: (checked: boolean) => void;
  onToggleSecondPerson: (checked: boolean) => void;
  onUpsell: () => void;
  onOpenLegal: (doc: LegalDocId) => void;
}

export function PostPurchaseUpsellCard({
  mode,
  lockedModules,
  upsellSecondsLeft,
  upsellTermsAccepted,
  upsellWaiver,
  upsellSecondPerson,
  upsellError,
  isPaying,
  onToggleTerms,
  onToggleWaiver,
  onToggleSecondPerson,
  onUpsell,
  onOpenLegal,
}: PostPurchaseUpsellProps) {
  return (
    <section
      aria-label="Oferta rozszerzenia raportu po zakupie"
      className="no-print mb-6 rounded-2xl border border-[#E84A27]/35 bg-[#FFF8F6] p-5 text-[#111114] sm:p-6"
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#C83717]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Oferta po zakupie · Wygasa za {formatTimer(upsellSecondsLeft)}</span>
          </p>
          <h2 className="font-display mt-1.5 text-xl font-semibold leading-snug text-[#111114]">
            Dobierz pozostałe {lockedModules.length} obszary + Kalendarz .ics i PDF A4 za{' '}
            <span className="font-mono tabular-nums text-[#E84A27]">
              {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
            </span>
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-[#111114]">
            {lockedModules.map((m) => (
              <li key={m.id} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>{m.shortTitle}</span>
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Kalendarz .ics + PDF A4</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-[#111114] lg:col-span-5">
          <div className="space-y-2 text-[11px] leading-snug text-zinc-600">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={upsellTermsAccepted}
                onChange={(e) => onToggleTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
              />
              <span>
                <strong className="text-[#E84A27]">*</strong> Mam 18 lat i akceptuję{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('regulamin')}
                  className="font-medium text-[#111114] underline hover:text-[#E84A27]"
                >
                  Regulamin
                </button>{' '}
                oraz{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('polityka')}
                  className="font-medium text-[#111114] underline hover:text-[#E84A27]"
                >
                  Politykę prywatności
                </button>
                .
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={upsellWaiver}
                onChange={(e) => onToggleWaiver(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
              />
              <span>
                <strong className="text-[#E84A27]">*</strong> {LEGAL_TEXTS.checkbox2Withdrawal}
              </span>
            </label>

            {mode === 'pair' && (
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={upsellSecondPerson}
                  onChange={(e) => onToggleSecondPerson(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                />
                <span>
                  <strong className="text-[#E84A27]">*</strong> {LEGAL_TEXTS.checkbox3SecondPerson}
                </span>
              </label>
            )}
          </div>

          {upsellError && (
            <p role="alert" className="mt-2.5 text-xs font-medium text-red-700">
              {upsellError}
            </p>
          )}

          <button
            type="button"
            disabled={isPaying}
            onClick={onUpsell}
            className="mt-3.5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#D43E1D] disabled:opacity-50"
          >
            <span>
              {isPaying
                ? 'Przekierowanie do Stripe...'
                : `Zamawiam i płacę ${formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}`}
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
