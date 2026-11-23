import { useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';

interface CalculatingScreenProps {
  personName: string;
  isPair: boolean;
  isReady?: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

const STEPS = [
  { threshold: 25, label: 'Wyznaczanie dokładnego momentu Solariusza 2027' },
  { threshold: 62, label: 'Analiza miesięcy wzrostu i okresów ostrożności' },
  { threshold: 92, label: 'Personalizacja wniosków oraz okien dat' },
];

export function CalculatingScreen({
  personName,
  isPair,
  isReady = false,
  error,
  onRetry,
  onBack,
}: CalculatingScreenProps) {
  const [percent, setPercent] = useState(6);

  useEffect(() => {
    if (error) return;
    if (isReady) {
      setPercent(100);
      return;
    }

    setPercent(6);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      // Smooth progressive curve: fast 6%->55% in 2.5s, steady 55%->88% in 2.5..8s, gentle crawl to 96%
      let target: number;
      if (elapsedSec < 2.5) {
        target = 6 + (elapsedSec / 2.5) * 49;
      } else if (elapsedSec < 8) {
        target = 55 + ((elapsedSec - 2.5) / 5.5) * 33;
      } else {
        target = 88 + Math.min(8, (elapsedSec - 8) * 0.65);
      }
      setPercent((prev) => Math.max(prev, Math.min(96, Math.round(target))));
    }, 120);

    return () => {
      window.clearInterval(interval);
    };
  }, [error, isReady]);

  const activeStepIdx =
    percent >= 92 ? 2 : percent >= 52 ? 1 : 0;

  return (
    <main className="mx-auto flex min-h-[72vh] w-full max-w-lg flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_12px_36px_rgba(17,17,20,0.05)] sm:p-8">
        {!error ? (
          <>
            {/* Animated Dots + Live Percentage Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-1.5"
                  aria-hidden="true"
                >
                  <span
                    className="solaris-dot h-2.5 w-2.5 rounded-full bg-[#E84A27]"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="solaris-dot h-2.5 w-2.5 rounded-full bg-[#E84A27]"
                    style={{ animationDelay: '180ms' }}
                  />
                  <span
                    className="solaris-dot h-2.5 w-2.5 rounded-full bg-[#E84A27]"
                    style={{ animationDelay: '360ms' }}
                  />
                </div>
                <span className="font-mono text-xs font-medium text-zinc-500">
                  {isReady ? 'Raport gotowy' : 'Trwają obliczenia'}
                </span>
              </div>

              <span
                role="status"
                aria-live="polite"
                className="font-mono text-3xl font-bold tabular-nums tracking-tight text-[#111114]"
              >
                {percent}%
              </span>
            </div>

            {/* Clean Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Postęp przygotowania raportu 2027"
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100"
            >
              <div
                style={{ width: `${percent}%` }}
                className="h-full rounded-full bg-[#E84A27] transition-[width] duration-200 ease-out"
              />
            </div>

            <h1 className="font-display mt-5 text-xl font-semibold leading-snug text-[#111114] sm:text-2xl">
              {personName}, przygotowujemy {isPair ? 'Wasz raport' : 'Twój raport'} na 2027
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              To zajmuje zwykle kilka sekund — nie zamykaj strony.
            </p>

            {/* 3 Clear Milestones */}
            <div className="mt-5 space-y-2.5">
              {STEPS.map((step, idx) => {
                const done = isReady || percent >= step.threshold + 22 || idx < activeStepIdx;
                const active = !done && idx === activeStepIdx;
                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-xs transition-colors sm:text-sm ${
                      done
                        ? 'border-emerald-200 bg-emerald-50/70 text-[#111114]'
                        : active
                          ? 'border-zinc-300 bg-[#FAFAFA] text-[#111114]'
                          : 'border-zinc-100 bg-white text-zinc-400'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : active
                            ? 'bg-[#FFF5F2] text-[#E84A27]'
                            : 'border border-zinc-200'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                      ) : active ? (
                        <span className="h-2 w-2 animate-ping rounded-full bg-[#E84A27]" />
                      ) : null}
                    </span>
                    <span className={active ? 'font-medium' : ''}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-2xl font-semibold text-[#111114]">
              Nie udało się dokończyć obliczeń
            </h1>
            <p role="alert" className="text-sm text-[#C83717]">
              {error}
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D43E1D]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Spróbuj ponownie</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:text-[#111114]"
              >
                Popraw dane
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
