import { useState, type FormEvent } from 'react';
import { Calendar, User, Users } from 'lucide-react';
import type { FunnelMode } from '../utils/solarisPricing';
import { formatBirthDateInput, parsePolishBirthDate } from '../utils/solarisMatrix';

export interface HeroQuickStartPayload {
  mode: FunnelMode;
  birthDate: string;
  partnerBirthDate?: string;
}

interface HeroProps {
  onStartFunnel: (mode?: FunnelMode) => void;
  onQuickStart: (payload: HeroQuickStartPayload) => void;
  returningBanner: {
    personName: string;
    riskMonthPl: string;
    onResume: () => void;
  } | null;
}

export function Hero({ onQuickStart, returningBanner }: HeroProps) {
  const [mode, setMode] = useState<FunnelMode>('solo');
  const [birthDate, setBirthDate] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedPrimary = parsePolishBirthDate(birthDate);
    if (!parsedPrimary.ok) {
      setError(parsedPrimary.error);
      return;
    }

    let normalizedPartnerDate: string | undefined;
    if (mode === 'pair' && partnerBirthDate.trim().length > 0) {
      const parsedPartner = parsePolishBirthDate(partnerBirthDate);
      if (!parsedPartner.ok) {
        setError(`Druga osoba: ${parsedPartner.error}`);
        return;
      }
      normalizedPartnerDate = parsedPartner.value.formatted;
    }

    setError(null);
    onQuickStart({
      mode,
      birthDate: parsedPrimary.value.formatted,
      partnerBirthDate: normalizedPartnerDate,
    });
  };

  return (
    <section
      id="hero-top"
      className="px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16"
    >
      {/* Returning Non-Buyer Recovery Strip — shown ONLY if user previously created an unpaid report */}
      {returningBanner && (
        <div className="mx-auto mb-6 flex max-w-[560px] flex-col items-start justify-between gap-3 rounded-2xl border border-[#E84A27]/30 bg-[#FFF5F2] px-4 py-3 text-left sm:flex-row sm:items-center">
          <div className="text-xs leading-relaxed text-zinc-700 sm:text-[13px]">
            <strong className="font-semibold text-[#111114]">
              {returningBanner.personName}, Twój raport 2027 czeka.
            </strong>{' '}
            Alert na {returningBanner.riskMonthPl.toLowerCase()} jest gotowy — masz aktywny rabat{' '}
            <span className="font-mono font-semibold text-[#C83717]">-20%</span>.
          </div>
          <button
            type="button"
            onClick={returningBanner.onResume}
            className="inline-flex min-h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#E84A27] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D]"
          >
            Wróć do raportu
          </button>
        </div>
      )}

      {/* Minimalist Direct-Response Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mx-auto max-w-2xl text-balance font-display text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[#111114]">
          Sprawdź swoje{' '}
          <span className="whitespace-nowrap text-[#E84A27]">3 kluczowe daty</span> na 2027 rok
        </h1>

        <p className="mx-auto mt-4 max-w-[520px] text-balance text-sm leading-relaxed text-zinc-600 sm:text-[17px]">
          Wpisz datę urodzenia i zobacz w 60 sekund, w których miesiącach uważać na finanse i relacje
        </p>

        {/* Clean Elevated Calculator Card — Zero Distractions */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mx-auto mt-7 max-w-[540px] rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-[0_12px_36px_rgba(17,17,20,0.06)] sm:mt-8 sm:p-6"
        >
          {/* Segmented Mode Control: Dla siebie / Dla pary */}
          <div
            role="group"
            aria-label="Wybierz tryb raportu"
            className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1"
          >
            <button
              type="button"
              aria-pressed={mode === 'solo'}
              onClick={() => {
                setMode('solo');
                setError(null);
              }}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] ${
                mode === 'solo'
                  ? 'bg-white text-[#111114] shadow-sm'
                  : 'text-zinc-600 hover:text-[#111114]'
              }`}
            >
              <User className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Dla siebie</span>
            </button>
            <button
              type="button"
              aria-pressed={mode === 'pair'}
              onClick={() => {
                setMode('pair');
                setError(null);
              }}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] ${
                mode === 'pair'
                  ? 'bg-white text-[#111114] shadow-sm'
                  : 'text-zinc-600 hover:text-[#111114]'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Dla pary</span>
            </button>
          </div>

          {/* Birth Date Input(s) + Primary CTA */}
          <div className="mt-4 space-y-3">
            <div
              className={
                mode === 'pair'
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end'
              }
            >
              <div>
                <label
                  htmlFor="hero-birth-date"
                  className="mb-1.5 block text-xs font-medium text-zinc-700"
                >
                  {mode === 'pair'
                    ? 'Twoja data urodzenia (DD.MM.RRRR)'
                    : 'Data urodzenia (DD.MM.RRRR)'}
                </label>
                <div className="relative">
                  <Calendar
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    id="hero-birth-date"
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday"
                    placeholder="np. 15.05.1996"
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(formatBirthDateInput(e.target.value));
                      if (error) setError(null);
                    }}
                    className="min-h-[50px] w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 font-mono text-base tabular-nums text-[#111114] placeholder:font-sans placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]/30"
                  />
                </div>
              </div>

              {mode === 'pair' ? (
                <div>
                  <label
                    htmlFor="hero-partner-birth-date"
                    className="mb-1.5 block text-xs font-medium text-zinc-700"
                  >
                    Data urodzenia partnera (opcjonalnie)
                  </label>
                  <div className="relative">
                    <Calendar
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                      aria-hidden="true"
                    />
                    <input
                      id="hero-partner-birth-date"
                      type="text"
                      inputMode="numeric"
                      placeholder="np. 22.08.1994"
                      value={partnerBirthDate}
                      onChange={(e) => {
                        setPartnerBirthDate(formatBirthDateInput(e.target.value));
                        if (error) setError(null);
                      }}
                      className="min-h-[50px] w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 font-mono text-base tabular-nums text-[#111114] placeholder:font-sans placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]/30"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="inline-flex min-h-[50px] w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#E84A27] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] focus-visible:ring-offset-2 sm:w-auto"
                >
                  Oblicz mój 2027 →
                </button>
              )}
            </div>

            {mode === 'pair' && (
              <button
                type="submit"
                className="inline-flex min-h-[50px] w-full items-center justify-center whitespace-nowrap rounded-xl bg-[#E84A27] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] focus-visible:ring-offset-2"
              >
                Oblicz mój 2027 →
              </button>
            )}

            {error && (
              <p role="alert" className="text-xs font-medium text-[#C83717]">
                {error}
              </p>
            )}
          </div>

          <p className="mt-3.5 text-center text-xs text-zinc-500">
            Bezpłatny skrót na start <span aria-hidden="true">·</span> Bez logowania{' '}
            <span aria-hidden="true">·</span> Wynik w 60 sekund
          </p>
        </form>
      </div>
    </section>
  );
}
