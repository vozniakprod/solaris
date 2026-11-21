import { useState } from 'react';
import { Calendar, Check, Clock, Lock, MoreHorizontal } from 'lucide-react';
import type { FunnelMode } from '../utils/solarisPricing';

interface HeroBentoDashboardProps {
  selectedMode: FunnelMode;
  onStartWithMode: (mode: FunnelMode) => void;
}

const MONTH_LABELS = ['Sty', 'Mar', 'Maj', 'Lip', 'Wrz', 'Lis'];

const SAMPLE_SOLO_ENERGY = [58, 64, 72, 78, 92, 86, 68, 61, 74, 48, 66, 79];
const SAMPLE_SOLO_RISK = [34, 38, 41, 46, 28, 36, 54, 59, 44, 81, 49, 32];

const SAMPLE_QUARTER_BARS = [
  { label: 'Q1', bottom: 24, height: 42, peak: false },
  { label: 'Q2', bottom: 44, height: 46, peak: true },
  { label: 'Q3', bottom: 18, height: 44, peak: false },
  { label: 'Q4', bottom: 26, height: 50, peak: false },
  { label: 'Rok', bottom: 30, height: 54, peak: false },
];

function buildSmoothSvgPath(values: number[], width: number, height: number): string {
  const padY = 12;
  const usableH = height - padY * 2;
  const stepX = width / (values.length - 1);
  const points = values.map((val, idx) => ({
    x: idx * stepX,
    y: padY + usableH - (val / 100) * usableH,
  }));

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = ((prev.x + curr.x) / 2).toFixed(1);
    d += ` C ${midX} ${prev.y.toFixed(1)}, ${midX} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  return d;
}

export function HeroBentoDashboard({
  selectedMode,
  onStartWithMode,
}: HeroBentoDashboardProps) {
  const [chartTab, setChartTab] = useState<'energia' | 'ryzyko'>('energia');

  const primarySeries = chartTab === 'energia' ? SAMPLE_SOLO_ENERGY : SAMPLE_SOLO_RISK;
  const secondarySeries = chartTab === 'energia' ? SAMPLE_SOLO_RISK : SAMPLE_SOLO_ENERGY;

  const primaryPath = buildSmoothSvgPath(primarySeries, 280, 112);
  const secondaryPath = buildSmoothSvgPath(secondarySeries, 280, 112);

  return (
    <section
      id="hero-showcase"
      aria-label="Przykładowy podgląd raportu Solaris 2027"
      className="relative mx-auto mt-7 w-full max-w-[1160px] sm:mt-9"
    >
      {/* Signature Figma 4-Column Analytical Bento Showcase (Curiosity Preview, not full report) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-[1.22fr_1.02fr_0.92fr_1.04fr] lg:items-stretch">
        {/* Card 1: Dark Sample Trajectory Card */}
        <article className="flex flex-col justify-between rounded-[22px] border border-white/[0.08] bg-[#141417]/95 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-white">
                Przykład: Finanse i Ryzyko
              </h2>
              <p className="mt-0.5 text-xs text-[#7D7D87]">
                Przykładowy wykres z raportu 2027
              </p>
            </div>
            <span className="font-mono shrink-0 border-b border-white/25 pb-0.5 text-sm font-medium tabular-nums text-white">
              {chartTab === 'energia' ? '92%' : '81%'}
            </span>
          </div>

          <div className="my-3.5">
            <div className="relative h-[116px] w-full">
              <svg
                viewBox="0 0 280 112"
                preserveAspectRatio="none"
                role="img"
                aria-label="Przykładowy wykres energii i ryzyka w 2027 roku"
                className="h-full w-full overflow-visible"
              >
                {[18, 46, 74, 102].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="280"
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d={secondaryPath}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <path
                  d={primaryPath}
                  fill="none"
                  stroke={chartTab === 'energia' ? '#FFFFFF' : '#FF7B5A'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-[#6E6E78]">
              {MONTH_LABELS.map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <span className="truncate font-mono text-[11px] tabular-nums text-[#9A9AA4]">
              {chartTab === 'energia' ? 'Szczyt: Maj 2027' : 'Alert: Paź 2027'}
            </span>
            <div
              role="group"
              aria-label="Widok przykładowego wykresu"
              className="flex shrink-0 items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => setChartTab('energia')}
                aria-pressed={chartTab === 'energia'}
                className={`min-h-[28px] whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] ${
                  chartTab === 'energia'
                    ? 'bg-white text-[#111114]'
                    : 'border border-white/15 bg-transparent text-[#A1A1AA] hover:text-white'
                }`}
              >
                Szanse
              </button>
              <button
                type="button"
                onClick={() => setChartTab('ryzyko')}
                aria-pressed={chartTab === 'ryzyko'}
                className={`min-h-[28px] whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] ${
                  chartTab === 'ryzyko'
                    ? 'bg-[#FF5C35] text-white'
                    : 'border border-white/15 bg-transparent text-[#A1A1AA] hover:text-white'
                }`}
              >
                Ryzyko
              </button>
            </div>
          </div>
        </article>

        {/* Card 2 Column: Warm Ivory Teaser Alerts + 2 Bottom Stat Tiles */}
        <div className="flex flex-col gap-3.5">
          <article className="flex-1 rounded-[22px] bg-[#F5F3EC] p-4 text-[#111114]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[14px] font-semibold tracking-[-0.01em] text-[#111114]">
                Przykładowe alerty
              </h2>
              <MoreHorizontal className="h-4 w-4 text-[#6B6B73]" aria-hidden="true" />
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1EFE7] text-[#18181B]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#111114]">
                      Okno podwyżki i umów
                    </p>
                    <p className="truncate font-mono text-[10px] tabular-nums text-[#6B6B73]">
                      14 Maj – 02 Cze 2027
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[#111114]">
                  94%
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#991B1B]">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#111114]">
                      Nie podpisuj w ciemno
                    </p>
                    <p className="truncate font-mono text-[10px] tabular-nums text-[#6B6B73]">
                      18 Paź – 27 Paź · Ukryte
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-medium text-[#991B1B]">
                  Ryzyko
                </span>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-3.5">
            <article className="flex flex-col justify-between rounded-[20px] border border-white/[0.08] bg-[#141417]/95 p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D8B4FE] text-[#111114]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-medium leading-tight text-[#D4D4DC]">
                  Eksport .ics
                </span>
              </div>
              <p className="mt-3.5 font-mono text-xl font-medium tabular-nums text-white">
                12 <span className="font-sans text-[11px] font-normal text-[#7D7D87]">okien</span>
              </p>
            </article>

            <article className="flex flex-col justify-between rounded-[20px] border border-white/[0.08] bg-[#141417]/95 p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4ADE80] text-[#111114]">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-medium leading-tight text-[#D4D4DC]">
                  {selectedMode === 'pair' ? 'Zgodność' : 'Indeks 2027'}
                </span>
              </div>
              <p className="mt-3.5 font-mono text-xl font-medium tabular-nums text-white">
                {selectedMode === 'pair' ? '87%' : '84%'}
              </p>
            </article>
          </div>
        </div>

        {/* Card 3: Pastel Lavender Quarterly Intensity Preview */}
        <article className="flex flex-col justify-between rounded-[22px] bg-[#E9D5FF] p-4 text-[#111114] sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[14px] font-semibold text-[#111114]">
              Presja vs Wzrost
            </h2>
            <span className="font-mono text-[11px] font-medium tabular-nums text-[#4C1D95]">
              2027
            </span>
          </div>

          <div className="my-3 flex items-end gap-2 pt-2">
            <div
              aria-hidden="true"
              className="flex h-[126px] shrink-0 flex-col justify-between pb-6 font-mono text-[9px] tabular-nums text-[#5B4973]"
            >
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            <div
              aria-label="Przykładowy rozkład kwartałów 2027"
              className="grid flex-1 grid-cols-5 items-end gap-1.5"
            >
              {SAMPLE_QUARTER_BARS.map((bar) => (
                <div
                  key={bar.label}
                  className="flex flex-col items-center justify-end gap-2"
                >
                  <div className="relative h-[106px] w-2.5 rounded-full bg-[#18181B]/[0.09] sm:w-3">
                    <div
                      style={{
                        bottom: `${bar.bottom}%`,
                        height: `${bar.height}%`,
                      }}
                      className={`absolute inset-x-0 rounded-full ${
                        bar.peak ? 'bg-[#111114]' : 'bg-[#A855F7]/50'
                      }`}
                    />
                  </div>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums ${
                      bar.peak ? 'bg-[#111114] text-white' : 'text-[#4B3F5C]'
                    }`}
                  >
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-medium text-[#3F2E56]">
            Przykład: przełom w <span className="font-mono font-semibold">Q2</span>
          </p>
        </article>

        {/* Card 4: Dark Modular Structure Teaser Card */}
        <article className="flex flex-col justify-between rounded-[22px] border border-white/[0.08] bg-[#141417]/95 p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display whitespace-nowrap text-[15px] font-semibold text-white">
                Wybierasz sfery
              </h2>
              <span className="font-mono shrink-0 whitespace-nowrap text-[11px] tabular-nums text-[#7D7D87]">
                od 14,99 zł
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <button
                type="button"
                onClick={() => onStartWithMode('solo')}
                className="flex min-h-[50px] w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left transition-colors duration-150 hover:border-white/20"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#D8B4FE] bg-[#D8B4FE] text-[#111114]">
                  <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">
                    Finanse i Kariera 2027
                  </span>
                  <span className="block truncate text-[11px] text-[#7D7D87]">
                    Stawki, zmiany pracy, ryzyko umów
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartWithMode('pair')}
                className="flex min-h-[50px] w-full items-center gap-3 rounded-xl border border-white/[0.14] bg-white/[0.06] px-3 py-2 text-left transition-colors duration-150 hover:border-[#FF5C35]/70"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#D8B4FE] bg-[#D8B4FE] text-[#111114]">
                  <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">
                    Zgodność dla dwojga
                  </span>
                  <span className="block truncate text-[11px] text-[#7D7D87]">
                    Para, przyjaciele lub wspólnik
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartWithMode(selectedMode)}
                className="flex min-h-[50px] w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition-colors duration-150 hover:border-white/20"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">
                    Zmiany, Przeprowadzki i Decyzje
                  </span>
                  <span className="block truncate text-[11px] text-[#7D7D87]">
                    + darmowy skrót zanim zapłacisz
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
            <span className="text-[#8E8E98]">Bezpłatny skrót na start</span>
            <span className="font-mono font-semibold tabular-nums text-[#FF7B5A]">
              0 zł
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
