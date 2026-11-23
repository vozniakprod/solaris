import { useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';

interface CalculatingScreenProps {
  personName: string;
  isPair: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

const STEPS = [
  'Wyznaczanie dokładnego momentu Solariusza 2027',
  'Analiza miesięcy wzrostu oraz okresów ostrożności',
  'Przygotowanie Twojego osobistego skrótu i okien dat',
];

export function CalculatingScreen({
  personName,
  isPair,
  error,
  onRetry,
  onBack,
}: CalculatingScreenProps) {
  const [completedStep, setCompletedStep] = useState(0);

  useEffect(() => {
    if (error) return;
    const t1 = window.setTimeout(() => setCompletedStep(1), 500);
    const t2 = window.setTimeout(() => setCompletedStep(2), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgba(17,17,20,0.05)] sm:p-8">
        {!error ? (
          <>
            <p className="font-mono text-xs font-medium text-[#E84A27]">
              Obliczenia 2027 w toku
            </p>
            <h1 className="font-display mt-2 text-2xl font-semibold text-[#111114] sm:text-3xl">
              {personName}, przygotowujemy {isPair ? 'Wasz raport' : 'Twój raport'} na 2027
            </h1>

            <div className="mt-6 space-y-2.5">
              {STEPS.map((label, idx) => {
                const done = idx < completedStep;
                const active = idx === completedStep;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-xs sm:text-sm ${
                      done
                        ? 'border-emerald-200 bg-emerald-50/70 text-[#111114]'
                        : active
                          ? 'border-zinc-300 bg-zinc-50 text-[#111114]'
                          : 'border-zinc-100 bg-white text-zinc-400'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : active
                            ? 'border-2 border-[#E84A27] text-[#E84A27]'
                            : 'border border-zinc-300'
                      }`}
                    >
                      {done && <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />}
                    </span>
                    <span>{label}</span>
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
