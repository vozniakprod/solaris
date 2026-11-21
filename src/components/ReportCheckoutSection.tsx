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

  // Marginal upgrade hint when choosing partial modules
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
      {/* PART 1: Editorial Locked Teasers — shows real personalized hooks without duplicating checkboxes */}
      <div>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#9A9AA3]">
              Zamknięte rozdziały Twojego raportu
            </p>
            <h2 className="font-display mt-1.5 text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">
              Co dokładnie odblokujesz na 2027 rok
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-[#9A9AA3]">
            Każdy obszar zawiera 2-częściową analizę, 3 konkretne ruchy, listę czerwonych flag i przedziały dat.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {lockedModules.map((mod) => {
            const content = report.modules[mod.id];
            const isIncluded = selectedModules.includes(mod.id);
            return (
              <article
                key={mod.id}
                className="flex flex-col justify-between rounded-[22px] border border-white/[0.08] bg-[#121215] p-5 transition-colors duration-150 hover:border-white/[0.16]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#A1A1AA]">
                      <Lock className="h-3.5 w-3.5 text-[#FF7B5A]" aria-hidden="true" />
                      <span>
                        {mod.shortTitle} · {content.scoreOutOf10}/10
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onFocusModuleFromPreview(mod.id)}
                      className="text-[11px] font-medium text-[#D4D4DC] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                    >
                      {isIncluded ? 'W pakiecie poniżej' : 'Wybierz ten obszar'}
                    </button>
                  </div>

                  <h3 className="font-display mt-3 text-base font-semibold leading-snug text-white">
                    {content.teaserTitle}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#B4B4BE]">
                    {content.teaserSnippet}
                  </p>
                </div>

                {/* Subtle blurred preview tail */}
                <div
                  aria-hidden="true"
                  className="mt-3.5 select-none border-t border-white/[0.06] pt-3 blur-[4px] opacity-40"
                >
                  <p className="text-xs text-[#D4D4DC]">
                    Dokładne przedziały dat, 3 kroki działania przed szczytem oraz czerwone flagi do uniknięcia.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* PART 2: Signature Warm Sand Editorial Checkout Block (Exact Figma Contrast Anchor) */}
      <div
        id="checkout-panel"
        className="rounded-[28px] bg-[#D6D1C4] p-5 text-[#111114] sm:rounded-[34px] sm:p-8 lg:p-10"
      >
        {/* Top Editorial Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#111114]/12 pb-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#57544D]">
              Jednorazowy dostęp · Bez subskrypcji
            </p>
            <h2 className="font-display mt-1.5 text-[clamp(1.6rem,3vw,2.35rem)] font-medium leading-[1.12] tracking-[-0.025em] text-[#111114]">
              Wybierz, ile chcesz zobaczyć ze swojego 2027 roku
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-[#4A4842] sm:text-right">
            Natychmiastowy dostęp po płatności BLIK, Apple Pay, Google Pay lub kartą.
          </p>
        </div>

        {/* Active Downsell or Retention Banner */}
        {useDownsellOffer && downsellSecondsLeft > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111114] px-4 py-3 text-xs text-white">
            <span>
              Aktywna oferta startowa: <strong className="text-[#4ADE80]">1 wybrany obszar + 3 daty za 9,99 zł</strong> (zamiast 14,99 zł).
            </span>
            <span className="font-mono font-semibold tabular-nums text-[#FF7B5A]">
              Wygasa za {formatTimer(downsellSecondsLeft)}
            </span>
          </div>
        )}

        {hasRetentionDiscount && !useDownsellOffer && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111114] px-4 py-3 text-xs text-white">
            <span>
              Aktywny rabat powrotny <strong className="text-[#FF7B5A]">-20%</strong> na Pełny Raport 2027:{' '}
              <strong className="font-mono tabular-nums">35,99 zł</strong> zamiast 44,99 zł.
            </span>
          </div>
        )}

        {/* 2-Column Clean Checkout Grid */}
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN (7 cols): Step 1 — Clear 2-Path Choice Architecture */}
          <div className="space-y-4 lg:col-span-7">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-[#4A4842]">
              01. Wybierz wariant raportu
            </p>

            {/* OPTION A: FULL PACKAGE (Clear visual anchor, 1-click selection) */}
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
              className={`cursor-pointer rounded-[24px] p-5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] sm:p-6 ${
                isFullSelected
                  ? 'bg-[#111114] text-white ring-2 ring-[#FF5C35]'
                  : 'bg-[#F5F3EC] text-[#111114] hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      isFullSelected
                        ? 'border-[#FF5C35] bg-[#FF5C35] text-white'
                        : 'border-[#111114]/35 bg-transparent'
                    }`}
                  >
                    {isFullSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`font-mono text-[11px] font-medium ${
                        isFullSelected ? 'text-[#FF8566]' : 'text-[#8C321A]'
                      }`}
                    >
                      Najczęściej wybierany · Oszczędzasz {formatPlnFromGrosze(fullPackageSavingsGrosze)}
                    </p>
                    <h3 className="font-display mt-0.5 text-lg font-semibold leading-snug sm:text-xl">
                      Pełny Raport 2027 ({availableModules.length} obszary)
                    </h3>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono text-xs tabular-nums line-through ${
                      isFullSelected ? 'text-[#8E8E98]' : 'text-[#737068]'
                    }`}
                  >
                    {formatPlnFromGrosze(fullPackageRegularGrosze)}
                  </p>
                  <p className="font-mono text-2xl font-bold tabular-nums">
                    {formatPlnFromGrosze(fullPackagePriceGrosze)}
                  </p>
                </div>
              </div>

              <div
                className={`mt-4 grid grid-cols-1 gap-2 border-t pt-4 text-xs sm:grid-cols-2 ${
                  isFullSelected
                    ? 'border-white/[0.1] text-[#D4D4DC]'
                    : 'border-[#111114]/10 text-[#3E3C37]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      isFullSelected ? 'text-[#4ADE80]' : 'text-[#166534]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    Wszystkie {availableModules.length} sfery (
                    {availableModules.map((m) => m.shortTitle).join(', ')})
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      isFullSelected ? 'text-[#D8B4FE]' : 'text-[#5B21B6]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Kalendarz .ics (12 okien)</strong> do telefonu — <strong>GRATIS</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      isFullSelected ? 'text-[#D8B4FE]' : 'text-[#5B21B6]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Wersja A4 PDF</strong> do zapisu i druku — <strong>GRATIS</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      isFullSelected ? 'text-[#4ADE80]' : 'text-[#166534]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Pełne checklisty decyzji na wszystkie 12 miesięcy 2027</span>
                </div>
              </div>
            </div>

            {/* OPTION B: PICK INDIVIDUAL MODULES */}
            <div
              className={`rounded-[24px] p-5 transition-all duration-150 sm:p-6 ${
                !isFullSelected
                  ? 'bg-[#F5F3EC] text-[#111114] ring-2 ring-[#111114]'
                  : 'bg-[#ECE8DD] text-[#111114] hover:bg-[#F5F3EC]'
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
                        : 'border-[#111114]/35 bg-transparent'
                    }`}
                  >
                    {!isFullSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-medium text-[#5C5951]">
                      1: 14,99 zł · 2: 24,99 zł · 3: 32,99 zł
                    </p>
                    <h3 className="font-display mt-0.5 text-lg font-semibold leading-snug">
                      Wybierz pojedyncze obszary
                    </h3>
                  </div>
                </div>
                <span className="font-mono shrink-0 text-sm font-semibold tabular-nums text-[#111114]">
                  od {useDownsellOffer ? '9,99 zł' : '14,99 zł'}
                </span>
              </button>

              {/* Show module selector cleanly ONLY when custom/partial mode is active */}
              {!isFullSelected && (
                <div className="mt-4 space-y-2.5 border-t border-[#111114]/10 pt-4">
                  {lockedModules.map((mod) => {
                    const checked = selectedModules.includes(mod.id);
                    const score = report.modules[mod.id]?.scoreOutOf10;
                    return (
                      <label
                        key={mod.id}
                        className={`flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${
                          checked
                            ? 'border-[#111114] bg-white'
                            : 'border-[#111114]/12 bg-[#FAF9F5] hover:border-[#111114]/35'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleModule(mod.id)}
                            className="h-4 w-4 shrink-0 accent-[#FF5C35]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111114]">{mod.title}</p>
                            <p className="text-xs leading-snug text-[#57544D]">{mod.tagline}</p>
                          </div>
                        </div>
                        {typeof score === 'number' && (
                          <span className="font-mono shrink-0 text-xs font-medium tabular-nums text-[#57544D]">
                            {score}/10
                          </span>
                        )}
                      </label>
                    );
                  })}

                  {/* Clean Calendar .ics Order Bump */}
                  {pricing.moduleCount > 0 && (
                    <label
                      className={`mt-3 flex cursor-pointer items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-xs transition-colors ${
                        includeCalendarBump
                          ? 'border-[#5B21B6] bg-[#F3E8FF]'
                          : 'border-[#111114]/15 bg-white hover:border-[#111114]/35'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={includeCalendarBump}
                          onChange={(e) => onToggleCalendarBump(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                        />
                        <div>
                          <p className="font-semibold text-[#111114]">
                            Dodaj Kalendarz Złotych i Ryzykownych Dat 2027 (.ics)
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#4A4842]">
                            12 konkretnych przedziałów dat prosto do Apple Calendar lub Google Calendar.
                          </p>
                        </div>
                      </div>
                      <span className="font-mono shrink-0 font-semibold tabular-nums text-[#111114]">
                        +9,99 zł
                      </span>
                    </label>
                  )}

                  {/* Helpful Marginal Upgrade Hint */}
                  {pricing.moduleCount > 0 && upgradeToFullDiffGrosze > 0 && (
                    <div className="mt-3 flex flex-col items-start justify-between gap-2.5 rounded-2xl bg-[#111114] px-4 py-3.5 text-xs text-white sm:flex-row sm:items-center">
                      <p className="leading-relaxed text-[#D4D4DC]">
                        {pricing.moduleCount === 1 ? (
                          <>
                            Dodaj 2. obszar za <strong className="text-white">+10 zł</strong> albo weź{' '}
                            <strong className="text-white">Pełny Raport</strong> i odbierz kalendarz .ics + PDF gratis.
                          </>
                        ) : (
                          <>
                            Za jedyne{' '}
                            <strong className="font-mono text-[#FF8566]">
                              +{formatPlnFromGrosze(upgradeToFullDiffGrosze)}
                            </strong>{' '}
                            dostajesz wszystkie obszary + kalendarz .ics i PDF A4 gratis.
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={onSelectFullBundle}
                        className="shrink-0 whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#111114] transition-opacity hover:opacity-90"
                      >
                        Przełącz na Pełny
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quiet 3-step fulfillment reassurance (balances left column height cleanly on desktop) */}
            <div className="grid grid-cols-1 gap-3 border-t border-[#111114]/12 pt-5 text-xs text-[#3E3C37] sm:grid-cols-3">
              <div>
                <p className="font-semibold text-[#111114]">1. Bezpieczna płatność</p>
                <p className="mt-1 leading-relaxed text-[#57544D]">
                  Płacisz przez Stripe (BLIK, Apple Pay, karta). Jednorazowo, bez subskrypcji.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111114]">2. Natychmiastowy wynik</p>
                <p className="mt-1 leading-relaxed text-[#57544D]">
                  Zaraz po powrocie ze Stripe wszystkie wybrane moduły otwierają się na tej stronie.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111114]">3. Kopia na Twój e-mail</p>
                <p className="mt-1 leading-relaxed text-[#57544D]">
                  Pełny raport (oraz plik .ics w załączniku) wysyłamy od razu na skrzynkę + masz PDF A4 na stronie.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Step 2 — Precision Dark Summary & Legal Checkout Card */}
          <div className="rounded-[26px] bg-[#111114] p-5 text-white sm:p-6 lg:col-span-5">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#9A9AA3]">
              02. Podsumowanie i płatność
            </p>

            {/* Clean Itemized Order Lines */}
            <div className="mt-4 space-y-2.5 border-b border-white/[0.09] pb-4 text-xs">
              {pricing.moduleCount === 0 ? (
                <p className="text-[#FF8566]">Zaznacz co najmniej jeden obszar po lewej stronie.</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">
                        {pricing.isFullBundle
                          ? `Pełny Raport Solaris 2027 (${pricing.moduleCount} sfer)`
                          : `Wybrane obszary 2027 (${pricing.moduleCount})`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8E8E98]">
                        {selectedModuleDefs.map((m) => m.shortTitle).join(' · ')}
                      </p>
                    </div>
                    <span className="font-mono shrink-0 tabular-nums text-[#E4E4EA]">
                      {pricing.formattedModulesPln}
                    </span>
                  </div>

                  {(showCalendarFree || showCalendarPaid) && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#C4C4CE]">Kalendarz 12 okien (.ics)</span>
                      <span
                        className={`font-mono shrink-0 tabular-nums ${
                          showCalendarFree ? 'font-semibold text-[#4ADE80]' : 'text-[#E4E4EA]'
                        }`}
                      >
                        {showCalendarFree ? 'GRATIS' : '9,99 zł'}
                      </span>
                    </div>
                  )}

                  {pricing.includesFreeCalendarAndPdf && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#C4C4CE]">Wersja do druku PDF A4</span>
                      <span className="font-mono shrink-0 font-semibold text-[#4ADE80]">GRATIS</span>
                    </div>
                  )}

                  {pricing.discountGrosze > 0 && (
                    <div className="flex items-center justify-between gap-3 text-[#4ADE80]">
                      <span>{useDownsellOffer ? 'Oferta startowa' : 'Rabat powrotny -20%'}</span>
                      <span className="font-mono shrink-0 tabular-nums">
                        −{formatPlnFromGrosze(pricing.discountGrosze)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Grand Total */}
            <div className="mt-4 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs text-[#9A9AA3]">Do zapłaty brutto</p>
                <p className="text-[11px] text-[#73737D]">Jednorazowo · bez odnawiania</p>
              </div>
              <div className="text-right">
                {pricing.isFullBundle && (
                  <p className="font-mono text-xs tabular-nums text-[#73737D] line-through">
                    {formatPlnFromGrosze(fullPackageRegularGrosze)}
                  </p>
                )}
                <p className="font-mono text-3xl font-bold tabular-nums text-white">
                  {pricing.formattedFinalPln}
                </p>
              </div>
            </div>

            {/* Optional Email Input for Direct Report Delivery + Stripe Prefill */}
            <div className="mt-5">
              <label
                htmlFor="checkout-delivery-email"
                className="flex items-center gap-1.5 text-[11px] font-medium text-[#D4D4DC]"
              >
                <Mail className="h-3.5 w-3.5 text-[#FF8566]" aria-hidden="true" />
                <span>E-mail do wysyłki pełnego raportu i pliku .ics</span>
              </label>
              <input
                id="checkout-delivery-email"
                type="email"
                autoComplete="email"
                placeholder="twoj@email.pl"
                value={checkoutEmail}
                onChange={(e) => onChangeCheckoutEmail(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-white/[0.14] bg-[#18181D] px-3.5 text-sm text-white placeholder:text-[#6E6E78] focus:border-[#FF5C35] focus:outline-none"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#8E8E98]">
                Przekażemy ten adres do Stripe, abyś nie musiał/a wpisywać go drugi raz. Pełny raport wyślemy prosto na skrzynkę.
              </p>
            </div>

            {/* Clean Hairline Legal Consents (100% Polish-law compliant, unchecked by default) */}
            <div className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.09] text-[11px] leading-relaxed text-[#C4C4CE]">
              <label className="flex cursor-pointer items-start gap-2.5 py-3">
                <input
                  type="checkbox"
                  checked={termsAndAgeAccepted}
                  onChange={(e) => onToggleTermsAndAge(e.target.checked)}
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

              <label className="flex cursor-pointer items-start gap-2.5 py-3">
                <input
                  type="checkbox"
                  checked={waiverAccepted}
                  onChange={(e) => onToggleWaiver(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>
                  <strong className="text-[#FF7B5A]">*</strong> {LEGAL_TEXTS.checkbox2Withdrawal}
                </span>
              </label>

              {report.mode === 'pair' && (
                <label className="flex cursor-pointer items-start gap-2.5 py-3">
                  <input
                    type="checkbox"
                    checked={secondPersonConsentAccepted}
                    onChange={(e) => onToggleSecondPerson(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                  />
                  <span>
                    <strong className="text-[#FF7B5A]">*</strong> {LEGAL_TEXTS.checkbox3SecondPerson}
                  </span>
                </label>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 py-3 text-[#8E8E98]">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => onToggleMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>{LEGAL_TEXTS.checkbox4Marketing} (opcjonalnie)</span>
              </label>
            </div>

            {checkoutError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-[#FF5C35]/40 bg-[#FF5C35]/10 px-3 py-2 text-xs font-medium text-[#FFD7CC]"
              >
                {checkoutError}
              </p>
            )}

            {/* Primary Polish Legal Payment CTA */}
            <button
              type="button"
              disabled={isPaying || pricing.moduleCount === 0}
              onClick={onCheckout}
              className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-6 py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B] disabled:opacity-50"
            >
              <span>
                {isPaying
                  ? 'Przekierowanie do Stripe...'
                  : `Zamawiam i płacę ${pricing.formattedFinalPln}`}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Payment Methods & Required Legal Disclaimers */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1AA]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#4ADE80]" aria-hidden="true" />
              <span>BLIK · Apple Pay · Google Pay · Karta · Stripe</span>
            </div>

            <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-[#7D7D87]">
              <p className="text-[#9A9AA3]">{LEGAL_TEXTS.underPayButtonDisclaimer}</p>
              <p>{LEGAL_TEXTS.underPayButtonStripeNote}</p>
              <p>{LEGAL_TEXTS.checkoutFullDisclaimer}</p>
            </div>

            {/* Quiet Non-Buyer Rescue Link */}
            <div className="mt-4 border-t border-white/[0.08] pt-4 text-center">
              <button
                type="button"
                onClick={onOpenExitRescue}
                className="min-h-[38px] text-xs font-medium text-[#B4B4BE] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
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
      className="no-print mb-6 rounded-[26px] bg-[#D6D1C4] p-5 text-[#111114] sm:p-7"
    >
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8C321A]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Oferta po zakupie · Wygasa za {formatTimer(upsellSecondsLeft)}</span>
          </p>
          <h2 className="font-display mt-1.5 text-xl font-semibold leading-snug text-[#111114] sm:text-2xl">
            Dobierz pozostałe {lockedModules.length} obszary + Kalendarz .ics i PDF A4 za{' '}
            <span className="font-mono tabular-nums">
              {formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE)}
            </span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#4A4842] sm:text-sm">
            Zamiast dopłacać osobno za każdą sferę, jednym kliknięciem uzupełnisz cały raport 2027:
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-[#111114]">
            {lockedModules.map((m) => (
              <li key={m.id} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" />
                <span>{m.shortTitle}</span>
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" />
              <span>Kalendarz .ics (12 okien)</span>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" />
              <span>Eksport PDF A4</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-[#111114] p-4 text-white sm:p-5 lg:col-span-5">
          <div className="space-y-2.5 text-[11px] leading-relaxed text-[#C4C4CE]">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={upsellTermsAccepted}
                onChange={(e) => onToggleTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
              />
              <span>
                <strong className="text-[#FF7B5A]">*</strong> Mam ukończone 18 lat i akceptuję{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('regulamin')}
                  className="text-white underline hover:text-[#FF7B5A]"
                >
                  Regulamin
                </button>{' '}
                oraz{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('polityka')}
                  className="text-white underline hover:text-[#FF7B5A]"
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
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
              />
              <span>
                <strong className="text-[#FF7B5A]">*</strong> {LEGAL_TEXTS.checkbox2Withdrawal}
              </span>
            </label>

            {mode === 'pair' && (
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={upsellSecondPerson}
                  onChange={(e) => onToggleSecondPerson(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C35]"
                />
                <span>
                  <strong className="text-[#FF7B5A]">*</strong> {LEGAL_TEXTS.checkbox3SecondPerson}
                </span>
              </label>
            )}
          </div>

          {upsellError && (
            <p role="alert" className="mt-2.5 text-xs text-[#FF8566]">
              {upsellError}
            </p>
          )}

          <button
            type="button"
            disabled={isPaying}
            onClick={onUpsell}
            className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#FF6E4B] disabled:opacity-50"
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
