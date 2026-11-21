import { ArrowRight } from 'lucide-react';
import type { FunnelMode } from '../utils/solarisPricing';
import { HeroBentoDashboard } from './HeroBentoDashboard';

interface HeroProps {
  onStartFunnel: (mode?: FunnelMode) => void;
  returningBanner: {
    personName: string;
    riskMonthPl: string;
    onResume: () => void;
  } | null;
}

export function Hero({ onStartFunnel, returningBanner }: HeroProps) {
  return (
    <section
      id="hero-top"
      className="relative isolate overflow-x-clip px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-9 lg:px-8 lg:pb-14 lg:pt-10"
    >
      {/* Signature Figma Diagonal Studio Light Shafts */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 inset-x-0 bottom-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-20 -top-24 h-[520px] w-[260px] rotate-[34deg] bg-gradient-to-b from-[#EAE3D5]/[0.28] via-[#C8C1B4]/[0.11] to-transparent blur-2xl sm:left-[6%] sm:w-[340px]" />
        <div className="absolute left-[14%] -top-20 hidden h-[440px] w-[140px] rotate-[34deg] bg-gradient-to-b from-white/[0.14] via-[#DDD6C8]/[0.05] to-transparent blur-xl md:block" />
        <div className="absolute -right-20 -top-20 h-[500px] w-[240px] rotate-[34deg] bg-gradient-to-b from-[#F0EAE0]/[0.26] via-[#C9C3B8]/[0.10] to-transparent blur-2xl sm:right-[4%] sm:w-[320px]" />

        <svg
          viewBox="0 0 1440 420"
          fill="none"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[290px] hidden h-[320px] w-full opacity-85 md:block"
        >
          <path
            d="M -60 40 C 220 120, 420 260, 720 240 C 1040 220, 1220 110, 1500 50"
            stroke="rgba(255,255,255,0.065)"
            strokeWidth="1"
          />
          <path
            d="M -60 72 C 230 152, 430 292, 720 272 C 1040 252, 1230 142, 1500 82"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
          <path
            d="M -60 104 C 240 184, 440 324, 720 304 C 1040 284, 1240 174, 1500 114"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Returning Non-Buyer Recovery Strip (Дожим) — shown ONLY if user previously created an unpaid report */}
      {returningBanner && (
        <div className="mx-auto mb-6 flex max-w-2xl flex-col items-start justify-between gap-3 rounded-2xl border border-[#FF5C35]/40 bg-[#181314]/95 px-4 py-3 text-left sm:flex-row sm:items-center">
          <div className="text-xs leading-relaxed text-[#E4E4EA] sm:text-[13px]">
            <strong className="font-semibold text-white">
              {returningBanner.personName}, Twoja matryca 2027 czeka.
            </strong>{' '}
            Alert na {returningBanner.riskMonthPl.toLowerCase()} jest nadal zablokowany — aktywowaliśmy rabat{' '}
            <span className="font-mono font-semibold text-[#FF7B5A]">-20%</span> na pełny pakiet.
          </div>
          <button
            type="button"
            onClick={returningBanner.onResume}
            className="inline-flex min-h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#FF5C35] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B]"
          >
            Wróć do raportu
          </button>
        </div>
      )}

      {/* Centered Editorial Copy Block (Wysokie Obcasy / Noizz Pain -> Fact Tone) */}
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="font-display text-[clamp(1.95rem,3.8vw,3.3rem)] font-medium leading-[1.1] tracking-[-0.03em]">
          <span className="text-[#8E8E95]">Dlaczego 2027 Jednym Da </span>
          <span className="text-white">Awans,</span>
          <br className="hidden md:inline" />{' '}
          <span className="text-[#8E8E95]">A Innym </span>
          <span className="text-white">Kryzys Decyzji?</span>
        </h1>

        <p className="mx-auto mt-3.5 max-w-[530px] text-balance text-sm leading-relaxed text-[#9A9AA3] sm:mt-4 sm:text-[15px]">
          Bez ogólników i horoskopów z sieci. W 2 minuty sprawdzisz swój Solariusz 2027:
          konkretne okna na podwyżkę, trudne miesiące w relacjach i momenty, kiedy lepiej nie ryzykować.
        </p>

        {/* Clean Single-CTA Figma Capsule (No duplicate Solo/Pair toggle — selection lives cleanly inside the test) */}
        <div className="mx-auto mt-6 max-w-[480px] sm:mt-7">
          <div className="flex flex-col items-center justify-between gap-2 rounded-[26px] border border-white/[0.1] bg-[#1B1B1F]/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:flex-row sm:rounded-full sm:pl-5">
            <span className="whitespace-nowrap pt-1.5 text-xs font-medium text-[#A1A1AA] sm:pt-0 sm:text-[13px]">
              Solariusz 2027 · <span className="text-white">0 zł na start</span>
            </span>

            <button
              type="button"
              onClick={() => onStartFunnel()}
              className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#FF5C35] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:min-h-[46px] sm:w-auto"
            >
              <span>Sprawdź swój 2027</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-3 text-xs text-[#8E8E98]">
            Bez logowania <span aria-hidden="true">·</span> Wybór solo lub para w 1. kroku{' '}
            <span aria-hidden="true">·</span> Silnik efemeryd 2027
          </p>
        </div>
      </div>

      {/* Signature 4-Card Figma Bento Preview */}
      <HeroBentoDashboard onStartWithMode={(mode) => onStartFunnel(mode)} />
    </section>
  );
}
