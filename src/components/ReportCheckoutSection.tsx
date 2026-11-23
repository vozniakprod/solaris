import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  FileText,
  Lock,
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
  marketingConsent,
  checkoutEmail,
  checkoutError,
  isPaying,
  onChangeCheckoutEmail,
  onSelectFullBundle,
  onSelectSingleMode,
  onToggleModule,
  onFocusModuleFromPreview,
  onToggleCalendarBump,
  onToggleTermsAndAge,
  onToggleWaiver,
  onToggleSecondPerson,
  onToggleMarketing,
  onCheckout,
  onOpenLegal,
  onOpenExitRescue,
}: ReportCheckoutSectionProps) {
  const isFullSelected = pricing.isFullBundle && !useDownsellOffer;
  const fullPackageRegularGrosze = availableModules.length * 1499 + ORDER_BUMP_CALENDAR_GROSZE;
  const fullPackagePriceGrosze = hasRetentionDiscount ? 3599 : 4499;
  const fullPackageSavingsGrosze = Math.max(0, fullPackageRegularGrosze - fullPackagePriceGrosze);
  const upgradeToFullDiffGrosze = Math.max(0, fullPackagePriceGrosze - pricing.finalPriceGrosze);

  const selectedModuleDefs = lockedModules.filter((m) => selectedModules.includes(m.id));
  const showCalendarFree = pricing.includesFreeCalendarAndPdf;
  const showCalendarPaid = !showCalendarFree && includeCalendarBump && pricing.moduleCount > 0;

  return (
    <section
      id="modular-paywall"
      aria-label="Odblokuj pełny raport Solaris 2027"
      className="no-print mt-10 space-y-8"
    >
      {/* PART 1: Clean Locked Teasers */}
      <div>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs font-medium text-zinc-500">
              Zamknięte rozdziały Twojego raportu
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#111114] sm:text-3xl">
              Co dokładnie odblokujesz na 2027 rok
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-zinc-600">
            Każdy obszar zawiera pełną analizę, 3 konkretne kroki, listę czerwonych flag i przedziały dat.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {lockedModules.map((mod) => {
            const content = report.modules[mod.id];
            const isIncluded = selectedModules.includes(mod.id);
            return (
              <article
                key={mod.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors duration-150 hover:border-zinc-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-zinc-600">
                      <Lock className="h-3.5 w-3.5 text-[#E84A27]" aria-hidden="true" />
                      <span>
                        {mod.shortTitle} · {content.scoreOutOf10}/10
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onFocusModuleFromPreview(mod.id)}
                      className="text-xs font-medium text-[#E84A27] underline decoration-[#E84A27]/35 underline-offset-4 hover:text-[#111114]"
                    >
                      {isIncluded ? 'W pakiecie poniżej' : 'Wybierz ten obszar'}
                    </button>
                  </div>

                  <h3 className="font-display mt-3 text-base font-semibold leading-snug text-[#111114]">
                    {content.teaserTitle}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                    {content.teaserSnippet}
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3.5 select-none border-t border-zinc-100 pt-3 blur-[4px] opacity-40"
                >
                  <p className="text-xs text-zinc-700">
                    Dokładne przedziały dat, 3 kroki działania przed szczytem oraz czerwone flagi do uniknięcia.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* PART 2: Minimalist, High-Trust Light Checkout Panel */}
      <div
        id="checkout-panel"
        className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_12px_40px_rgba(17,17,20,0.06)] sm:p-8 lg:p-10"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="font-mono text-xs font-medium text-[#E84A27]">
              Jednorazowy dostęp · Bez subskrypcji
            </p>
            <h2 className="font-display mt-1 text-[clamp(1.5rem,3vw,2.2rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#111114]">
              Odblokuj swój pełny raport 2027
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500 sm:text-right">
            Natychmiastowy dostęp po płatności BLIK, Apple Pay, Google Pay lub kartą.
          </p>
        </div>

        {useDownsellOffer && downsellSecondsLeft > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
            <span>
              Aktywna oferta startowa: <strong>1 wybrany obszar + 3 daty za 9,99 zł</strong> (zamiast 14,99 zł).
            </span>
            <span className="font-mono font-semibold tabular-nums text-[#C83717]">
              Wygasa za {formatTimer(downsellSecondsLeft)}
            </span>
          </div>
        )}

        {hasRetentionDiscount && !useDownsellOffer && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E84A27]/30 bg-[#FFF5F2] px-4 py-3 text-xs text-[#111114]">
            <span>
              Aktywny rabat powrotny <strong className="text-[#E84A27]">-20%</strong> na Pełny Raport 2027:{' '}
              <strong className="font-mono tabular-nums">35,99 zł</strong> zamiast 44,99 zł.
            </span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN (7 cols): Step 01 — Simple 2-Option Selector */}
          <div className="space-y-4 lg:col-span-7">
            <p className="font-mono text-xs font-semibold text-zinc-500">
              01. Wybierz wariant raportu
            </p>

            {/* OPTION A: FULL PACKAGE */}
            <div
              onClick={onSelectFullBundle}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectFullBundle();
                }
              }}
              aria-pressed={isFullSelected}
              className={`cursor-pointer rounded-2xl border p-5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] sm:p-6 ${
                isFullSelected
                  ? 'border-[#E84A27] bg-[#FFF8F6] ring-1 ring-[#E84A27]'
                  : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      isFullSelected
                        ? 'border-[#E84A27] bg-[#E84A27] text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isFullSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold text-[#E84A27]">
                      Najczęściej wybierany · Oszczędzasz {formatPlnFromGrosze(fullPackageSavingsGrosze)}
                    </p>
                    <h3 className="font-display mt-0.5 text-lg font-semibold leading-snug text-[#111114] sm:text-xl">
                      Pełny Raport 2027 ({availableModules.length} obszary)
                    </h3>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs tabular-nums text-zinc-400 line-through">
                    {formatPlnFromGrosze(fullPackageRegularGrosze)}
                  </p>
                  <p className="font-mono text-2xl font-bold tabular-nums text-[#111114]">
                    {formatPlnFromGrosze(fullPackagePriceGrosze)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-zinc-200/80 pt-4 text-xs text-zinc-700 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>
                    Wszystkie {availableModules.length} sfery (
                    {availableModules.map((m) => m.shortTitle).join(', ')})
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E84A27]" aria-hidden="true" />
                  <span>
                    <strong>Kalendarz .ics (12 okien)</strong> do telefonu — <strong>GRATIS</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E84A27]" aria-hidden="true" />
                  <span>
                    <strong>Wersja A4 PDF</strong> do zapisu i druku — <strong>GRATIS</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>Pełne checklisty decyzji na wszystkie 12 miesięcy 2027</span>
                </div>
              </div>
            </div>

            {/* OPTION B: PICK INDIVIDUAL MODULES */}
            <div
              className={`rounded-2xl border p-5 transition-all duration-150 sm:p-6 ${
                !isFullSelected
                  ? 'border-[#111114] bg-white ring-1 ring-[#111114]'
                  : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
              }`}
            >
              <button
                type="button"
                onClick={onSelectSingleMode}
                aria-expanded={!isFullSelected}
                className="flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      !isFullSelected
                        ? 'border-[#111114] bg-[#111114] text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {!isFullSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-medium text-zinc-500">
                      1: 14,99 zł · 2: 24,99 zł · 3: 32,99 zł
                    </p>
                    <h3 className="font-display mt-0.5 text-lg font-semibold leading-snug text-[#111114]">
                      Wybierz pojedyncze obszary
                    </h3>
                  </div>
                </div>
                <span className="font-mono shrink-0 text-sm font-semibold tabular-nums text-[#111114]">
                  od {useDownsellOffer ? '9,99 zł' : '14,99 zł'}
                </span>
              </button>

              {!isFullSelected && (
                <div className="mt-4 space-y-2.5 border-t border-zinc-200 pt-4">
                  {lockedModules.map((mod) => {
                    const checked = selectedModules.includes(mod.id);
                    const score = report.modules[mod.id]?.scoreOutOf10;
                    return (
                      <label
                        key={mod.id}
                        className={`flex min-h-[54px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                          checked
                            ? 'border-[#111114] bg-white'
                            : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleModule(mod.id)}
                            className="h-4 w-4 shrink-0 accent-[#E84A27]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111114]">{mod.title}</p>
                            <p className="text-xs leading-snug text-zinc-500">{mod.tagline}</p>
                          </div>
                        </div>
                        {typeof score === 'number' && (
                          <span className="font-mono shrink-0 text-xs font-medium tabular-nums text-zinc-500">
                            {score}/10
                          </span>
                        )}
                      </label>
                    );
                  })}

                  {pricing.moduleCount > 0 && (
                    <label
                      className={`mt-3 flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3.5 text-xs transition-colors ${
                        includeCalendarBump
                          ? 'border-[#E84A27] bg-[#FFF5F2]'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={includeCalendarBump}
                          onChange={(e) => onToggleCalendarBump(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                        />
                        <div>
                          <p className="font-semibold text-[#111114]">
                            Dodaj Kalendarz Złotych i Ryzykownych Dat 2027 (.ics)
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
                            12 konkretnych przedziałów dat prosto do Apple Calendar lub Google Calendar.
                          </p>
                        </div>
                      </div>
                      <span className="font-mono shrink-0 font-semibold tabular-nums text-[#111114]">
                        +9,99 zł
                      </span>
                    </label>
                  )}

                  {pricing.moduleCount > 0 && upgradeToFullDiffGrosze > 0 && (
                    <div className="mt-3 flex flex-col items-start justify-between gap-2.5 rounded-xl border border-zinc-200 bg-[#FAFAFA] px-4 py-3.5 text-xs text-zinc-700 sm:flex-row sm:items-center">
                      <p className="leading-relaxed">
                        {pricing.moduleCount === 1 ? (
                          <>
                            Dodaj 2. obszar za <strong className="text-[#111114]">+10 zł</strong> albo weź{' '}
                            <strong className="text-[#111114]">Pełny Raport</strong> i odbierz kalendarz .ics + PDF gratis.
                          </>
                        ) : (
                          <>
                            Za jedyne{' '}
                            <strong className="font-mono text-[#E84A27]">
                              +{formatPlnFromGrosze(upgradeToFullDiffGrosze)}
                            </strong>{' '}
                            dostajesz wszystkie obszary + kalendarz .ics i PDF A4 gratis.
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={onSelectFullBundle}
                        className="shrink-0 whitespace-nowrap rounded-lg bg-[#111114] px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-zinc-800"
                      >
                        Przełącz na Pełny
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quiet 3-step fulfillment reassurance */}
            <div className="grid grid-cols-1 gap-3 border-t border-zinc-200 pt-5 text-xs text-zinc-600 sm:grid-cols-3">
              <div>
                <p className="font-semibold text-[#111114]">1. Bezpieczna płatność</p>
                <p className="mt-1 leading-relaxed text-zinc-500">
                  Płacisz przez Stripe (BLIK, Apple Pay, karta). Jednorazowo, bez subskrypcji.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111114]">2. Natychmiastowy wynik</p>
                <p className="mt-1 leading-relaxed text-zinc-500">
                  Zaraz po płatności wybrane moduły otwierają się bezpośrednio na tej stronie.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111114]">3. Kopia na Twój e-mail</p>
                <p className="mt-1 leading-relaxed text-zinc-500">
                  Pełny raport i plik .ics wysyłamy prosto na skrzynkę + masz PDF A4 na stronie.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Step 02 — Crisp Light Order Summary & Payment CTA */}
          <div className="rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-5 text-[#111114] sm:p-6 lg:col-span-5">
            <p className="font-mono text-xs font-semibold text-zinc-500">
              02. Podsumowanie i płatność
            </p>

            <div className="mt-4 space-y-2.5 border-b border-zinc-200 pb-4 text-xs">
              {pricing.moduleCount === 0 ? (
                <p className="text-[#C83717]">Zaznacz co najmniej jeden obszar po lewej stronie.</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111114]">
                        {pricing.isFullBundle
                          ? `Pełny Raport Solaris 2027 (${pricing.moduleCount} sfer)`
                          : `Wybrane obszary 2027 (${pricing.moduleCount})`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {selectedModuleDefs.map((m) => m.shortTitle).join(' · ')}
                      </p>
                    </div>
                    <span className="font-mono shrink-0 tabular-nums text-[#111114]">
                      {pricing.formattedModulesPln}
                    </span>
                  </div>

                  {(showCalendarFree || showCalendarPaid) && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Kalendarz 12 okien (.ics)</span>
                      <span
                        className={`font-mono shrink-0 tabular-nums ${
                          showCalendarFree ? 'font-semibold text-emerald-700' : 'text-[#111114]'
                        }`}
                      >
                        {showCalendarFree ? 'GRATIS' : '9,99 zł'}
                      </span>
                    </div>
                  )}

                  {pricing.includesFreeCalendarAndPdf && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Wersja do druku PDF A4</span>
                      <span className="font-mono shrink-0 font-semibold text-emerald-700">GRATIS</span>
                    </div>
                  )}

                  {pricing.discountGrosze > 0 && (
                    <div className="flex items-center justify-between gap-3 text-emerald-700">
                      <span>{useDownsellOffer ? 'Oferta startowa' : 'Rabat powrotny -20%'}</span>
                      <span className="font-mono shrink-0 font-semibold tabular-nums">
                        −{formatPlnFromGrosze(pricing.discountGrosze)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-700">Do zapłaty brutto</p>
                <p className="text-[11px] text-zinc-500">Jednorazowo · bez odnawiania</p>
              </div>
              <div className="text-right">
                {pricing.isFullBundle && (
                  <p className="font-mono text-xs tabular-nums text-zinc-400 line-through">
                    {formatPlnFromGrosze(fullPackageRegularGrosze)}
                  </p>
                )}
                <p className="font-mono text-3xl font-bold tabular-nums text-[#111114]">
                  {pricing.formattedFinalPln}
                </p>
              </div>
            </div>

            {/* Optional Email Input for Direct Report Delivery */}
            <div className="mt-5">
              <label
                htmlFor="checkout-delivery-email"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-700"
              >
                <Mail className="h-3.5 w-3.5 text-[#E84A27]" aria-hidden="true" />
                <span>E-mail do wysyłki raportu i pliku .ics</span>
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
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                Przekażemy ten adres do Stripe. Pełny raport wyślemy od razu na Twoją skrzynkę.
              </p>
            </div>

            {/* Required Polish Legal Consents (unchecked by default) */}
            <div className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 text-[11px] leading-relaxed text-zinc-600">
              <label className="flex cursor-pointer items-start gap-2.5 py-3">
                <input
                  type="checkbox"
                  checked={termsAndAgeAccepted}
                  onChange={(e) => onToggleTermsAndAge(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                />
                <span>
                  <strong className="text-[#E84A27]">*</strong> Mam ukończone 18 lat i akceptuję{' '}
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
                  oraz zapoznałem/am się z{' '}
                  <a
                    href="/polityka-prywatnosci"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenLegal('polityka');
                    }}
                    className="font-medium text-[#111114] underline hover:text-[#E84A27]"
                  >
                    Polityką prywatności
                  </a>
                  .
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 py-3">
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
                <label className="flex cursor-pointer items-start gap-2.5 py-3">
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

              <label className="flex cursor-pointer items-start gap-2.5 py-3 text-zinc-500">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => onToggleMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
                />
                <span>{LEGAL_TEXTS.checkbox4Marketing} (opcjonalnie)</span>
              </label>
            </div>

            {checkoutError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {checkoutError}
              </p>
            )}

            <button
              type="button"
              disabled={isPaying || pricing.moduleCount === 0}
              onClick={onCheckout}
              className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#D43E1D] disabled:opacity-50"
            >
              <span>
                {isPaying
                  ? 'Przekierowanie do Stripe...'
                  : `Zamawiam i płacę ${pricing.formattedFinalPln}`}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>BLIK · Apple Pay · Google Pay · Karta · Stripe</span>
            </div>

            <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-zinc-500">
              <p className="text-zinc-600">{LEGAL_TEXTS.underPayButtonDisclaimer}</p>
              <p>{LEGAL_TEXTS.underPayButtonStripeNote}</p>
              <p>{LEGAL_TEXTS.checkoutFullDisclaimer}</p>
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-4 text-center">
              <button
                type="button"
                onClick={onOpenExitRescue}
                className="min-h-[38px] text-xs font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-[#111114]"
              >
                Nie teraz — zapisz skrót i odbierz rabat -20%
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
      className="no-print mb-6 rounded-2xl border border-[#E84A27]/35 bg-[#FFF8F6] p-5 text-[#111114] sm:p-7"
    >
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#C83717]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Oferta po zakupie · Wygasa za {formatTimer(upsellSecondsLeft)}</span>
          </p>
          <h2 className="font-display mt-1.5 text-xl font-semibold leading-snug text-[#111114] sm:text-2xl">
            Dobierz pozostałe {lockedModules.length} obszary + Kalendarz .ics i PDF A4 za{' '}
            <span className="font-mono tabular-nums text-[#E84A27]">
              {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
            </span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 sm:text-sm">
            Zamiast dopłacać osobno za każdą sferę, jednym kliknięciem uzupełnisz cały raport 2027:
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-[#111114]">
            {lockedModules.map((m) => (
              <li key={m.id} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>{m.shortTitle}</span>
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Kalendarz .ics (12 okien)</span>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Eksport PDF A4</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-[#111114] sm:p-5 lg:col-span-5">
          <div className="space-y-2.5 text-[11px] leading-relaxed text-zinc-600">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={upsellTermsAccepted}
                onChange={(e) => onToggleTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#E84A27]"
              />
              <span>
                <strong className="text-[#E84A27]">*</strong> Mam ukończone 18 lat i akceptuję{' '}
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

            <label className="flex cursor-pointer items-start gap-2.5">
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
              <label className="flex cursor-pointer items-start gap-2.5">
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
            className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#D43E1D] disabled:opacity-50"
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
