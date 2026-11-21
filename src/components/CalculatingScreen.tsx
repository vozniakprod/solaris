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
  'Wyznaczanie dokładnego momentu Solariusza 2027 (efemerydy)',
  'Analiza aspektów planetarnych oraz miesięcy wzrostu i tarcia',
  'Składanie osobistego skrótu raportu i okien dat 2027',
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
      <div className="w-full rounded-[26px] border border-white/[0.09] bg-[#121215] p-6 sm:p-8">
        {!error ? (
          <>
            <p className="font-mono text-xs text-[#D8B4FE]">
              Silnik efemeryd i analiza matrycy solarnej
            </p>
            <h1 className="font-display mt-2 text-2xl font-medium text-white sm:text-3xl">
              {personName}, obliczamy {isPair ? 'Waszą matrycę' : 'Twoją matrycę'} na 2027
            </h1>

            <div className="mt-6 space-y-3">
              {STEPS.map((label, idx) => {
                const done = idx < completedStep;
                const active = idx === completedStep;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-xs sm:text-sm ${
                      done
                        ? 'border-[#4ADE80]/30 bg-[#4ADE80]/[0.06] text-white'
                        : active
                          ? 'border-white/[0.14] bg-white/[0.04] text-[#E4E4EA]'
                          : 'border-white/[0.05] bg-transparent text-[#6E6E78]'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        done
                          ? 'bg-[#4ADE80] text-[#111114]'
                          : active
                            ? 'border border-[#FF5C35] text-[#FF5C35]'
                            : 'border border-white/15'
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
            <h1 className="font-display text-2xl font-medium text-white">
              Nie udało się dokończyć obliczeń
            </h1>
            <p role="alert" className="text-sm text-[#FF8566]">
              {error}
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF6E4B]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Spróbuj ponownie</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-[#D4D4DC] hover:text-white"
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
