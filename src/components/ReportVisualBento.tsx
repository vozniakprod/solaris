import { useState } from 'react';
import { Calendar, Check, Clock, Lock, Unlock } from 'lucide-react';
import type { SolarisFullReport } from '../utils/ephemerisEngine';
import type { ReportModuleId } from '../utils/solarisPricing';

interface ReportVisualBentoProps {
  report: SolarisFullReport;
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  onFocusModulePaywall: (moduleId: ReportModuleId) => void;
}

const AXIS_MONTHS = ['Sty', 'Mar', 'Maj', 'Lip', 'Wrz', 'Lis'];

function buildSmoothSvgPath(values: number[], width: number, height: number): string {
  const padY = 12;
  const usableH = height - padY * 2;
  const stepX = width / Math.max(1, values.length - 1);
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

export function ReportVisualBento({
  report,
  unlockedModules,
  calendarUnlocked,
  onFocusModulePaywall,
}: ReportVisualBentoProps) {
  const [chartTab, setChartTab] = useState<'energia' | 'ryzyko'>('energia');

  const energySeries = report.monthlyTimeline.map((m) => m.energy);
  const riskSeries = report.monthlyTimeline.map((m) => m.risk);
  const primarySeries = chartTab === 'energia' ? energySeries : riskSeries;
  const secondarySeries = chartTab === 'energia' ? riskSeries : energySeries;

  const primaryPath = buildSmoothSvgPath(primarySeries, 280, 112);
  const secondaryPath = buildSmoothSvgPath(secondarySeries, 280, 112);

  const maxEnergy = Math.max(...energySeries);
  const maxRisk = Math.max(...riskSeries);
  const peakQuarter =
    report.quarterlyBars.find((q) => q.isPeak) ?? report.quarterlyBars[0];

  const compatPct = report.compatibilityScore ?? report.overallIndex2027;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - compatPct / 100);

  return (
    <section
      aria-label="Podsumowanie wizualne Solaris 2027"
      className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.22fr_1.04fr_0.92fr_1.06fr] lg:items-stretch"
    >
      {/* Card 1: Personalized Dual-Curve Trajectory */}
      <article className="print-card flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-[#111114]">
              Twoja krzywa 2027
            </h2>
            <p className="print-muted mt-0.5 text-xs text-zinc-500">
              {report.growthMonthsCount} mies. wzrostu · {report.riskMonthsCount} ostrożności
            </p>
          </div>
          <span className="font-mono shrink-0 text-sm font-semibold tabular-nums text-[#111114]">
            {chartTab === 'energia' ? `${maxEnergy}%` : `${maxRisk}%`}
          </span>
        </div>

        <div className="my-3.5">
          <div className="relative h-[116px] w-full">
            <svg
              viewBox="0 0 280 112"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Wykres energii i ryzyka 2027 dla ${report.person1.name}`}
              className="h-full w-full overflow-visible"
            >
              {[18, 46, 74, 102].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="280"
                  y2={y}
                  stroke="#E4E4E7"
                  strokeWidth="1"
                />
              ))}
              <path
                d={secondaryPath}
                fill="none"
                stroke="#A1A1AA"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <path
                d={primaryPath}
                fill="none"
                stroke={chartTab === 'energia' ? '#111114' : '#E84A27'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-zinc-500">
            {AXIS_MONTHS.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <span className="truncate font-mono text-[11px] tabular-nums text-zinc-600">
            {chartTab === 'energia'
              ? `Szczyt: ${report.peakMonthPl}`
              : `Alert: ${report.riskMonthPl}`}
          </span>
          <div
            role="group"
            aria-label="Przełącz widok Twojego wykresu 2027"
            className="no-print flex shrink-0 items-center gap-1"
          >
            <button
              type="button"
              onClick={() => setChartTab('energia')}
              aria-pressed={chartTab === 'energia'}
              className={`min-h-[28px] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                chartTab === 'energia'
                  ? 'bg-[#111114] text-white'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:text-[#111114]'
              }`}
            >
              Szanse
            </button>
            <button
              type="button"
              onClick={() => setChartTab('ryzyko')}
              aria-pressed={chartTab === 'ryzyko'}
              className={`min-h-[28px] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                chartTab === 'ryzyko'
                  ? 'bg-[#E84A27] text-white'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:text-[#111114]'
              }`}
            >
              Ryzyko
            </button>
          </div>
        </div>
      </article>

      {/* Card 2 Column: Real Alerts + 2 Clean Stat Tiles */}
      <div className="flex flex-col gap-3.5">
        <article className="print-card flex-1 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[14px] font-semibold text-[#111114]">
              Twoje alerty 2027
            </h2>
            <span className="font-mono text-[10px] font-medium text-zinc-500">
              Kluczowe okna
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {report.featuredAlerts.slice(0, 2).map((alert) => {
              const isUnlocked =
                !alert.locked ||
                calendarUnlocked ||
                unlockedModules.includes(alert.moduleId);
              const displayDate =
                isUnlocked && alert.type === 'risk'
                  ? report.modules[alert.moduleId]?.watchDates.split('·')[1]?.trim() ||
                    alert.dateRange
                  : alert.dateRange;

              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => {
                    if (!isUnlocked) {
                      onFocusModulePaywall(alert.moduleId);
                    }
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2.5 text-left transition-colors ${
                    !isUnlocked ? 'cursor-pointer hover:border-[#E84A27]/50' : 'cursor-default'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        alert.type === 'risk'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-zinc-200/70 text-[#111114]'
                      }`}
                    >
                      {isUnlocked ? (
                        alert.type === 'risk' ? (
                          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#111114]">
                        {alert.title}
                      </p>
                      <p className="truncate font-mono text-[10px] tabular-nums text-zinc-500">
                        {displayDate}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${
                      alert.type === 'risk' ? 'text-red-700' : 'text-[#111114]'
                    }`}
                  >
                    {alert.scoreLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </article>

        <div className="grid grid-cols-2 gap-3.5">
          <article className="print-card flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[#111114]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-zinc-600">
                Okna .ics
              </span>
            </div>
            <p className="mt-3 font-mono text-xl font-semibold tabular-nums text-[#111114]">
              {report.calendarEvents.length}{' '}
              <span className="font-sans text-[11px] font-normal text-zinc-500">
                {calendarUnlocked ? 'gotowe' : 'w pakiecie'}
              </span>
            </p>
          </article>

          <article className="print-card flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-zinc-600">
                {report.mode === 'pair' ? 'Zgodność' : 'Indeks 2027'}
              </span>
            </div>
            <p className="mt-3 font-mono text-xl font-semibold tabular-nums text-[#111114]">
              {report.mode === 'pair' && report.compatibilityScore !== null
                ? `${report.compatibilityScore}%`
                : `${report.overallIndex2027}%`}
            </p>
          </article>
        </div>
      </div>

      {/* Card 3: Quarterly Range Bars */}
      <article className="print-card flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14px] font-semibold text-[#111114]">
            Presja vs Wzrost
          </h2>
          <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-500">
            2027
          </span>
        </div>

        <div className="my-3 flex items-end gap-2 pt-2">
          <div
            aria-hidden="true"
            className="flex h-[126px] shrink-0 flex-col justify-between pb-6 font-mono text-[9px] tabular-nums text-zinc-400"
          >
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          <div
            aria-label="Twój rozkład kwartałów 2027"
            className="grid flex-1 grid-cols-5 items-end gap-1"
          >
            {report.quarterlyBars.map((bar) => (
              <div
                key={bar.label}
                className="flex flex-col items-center justify-end gap-2"
              >
                <div className="relative h-[106px] w-2.5 rounded-full bg-zinc-100">
                  <div
                    style={{
                      bottom: `${bar.bottomPct}%`,
                      height: `${bar.heightPct}%`,
                    }}
                    className={`absolute inset-x-0 rounded-full ${
                      bar.isPeak ? 'bg-[#E84A27]' : 'bg-zinc-400'
                    }`}
                  />
                </div>
                <span
                  className={`rounded px-1 py-0.5 font-mono text-[9px] font-medium tabular-nums ${
                    bar.isPeak ? 'bg-[#111114] text-white' : 'text-zinc-500'
                  }`}
                >
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="border-t border-zinc-100 pt-2.5 text-[11px] font-medium text-zinc-600">
          Twój przełom: <span className="font-mono font-semibold text-[#111114]">{peakQuarter.label}</span> ·{' '}
          {peakQuarter.energyAvg}% energii
        </p>
      </article>

      {/* Card 4: Pair Synergy Gauge OR Solo 4-Sphere Index */}
      {report.mode === 'pair' && report.compatibilityBreakdown ? (
        <article className="print-card flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display whitespace-nowrap text-[15px] font-semibold text-[#111114]">
              Synergia pary
            </h2>
            <span className="truncate font-mono text-[11px] text-zinc-500">
              {report.person1.name} &amp; {report.person2?.name}
            </span>
          </div>

          <div className="my-2.5 flex items-center justify-center">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle
                  cx="46"
                  cy="46"
                  r={radius}
                  fill="none"
                  stroke="#E4E4E7"
                  strokeWidth="8"
                />
                <circle
                  cx="46"
                  cy="46"
                  r={radius}
                  fill="none"
                  stroke="#E84A27"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-bold tabular-nums text-[#111114]">
                  {compatPct}%
                </span>
                <span className="text-[10px] text-zinc-500">Synergia</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-zinc-100 pt-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Decyzje i finanse</span>
              <span className="font-mono font-semibold tabular-nums text-[#111114]">
                {report.compatibilityBreakdown.decisionsAndFinance}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Komunikacja w stresie</span>
              <span className="font-mono font-semibold tabular-nums text-[#E84A27]">
                {report.compatibilityBreakdown.stressCommunication}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Wspólny rytm 2027</span>
              <span className="font-mono font-semibold tabular-nums text-[#111114]">
                {report.compatibilityBreakdown.sharedRhythm2027}%
              </span>
            </div>
          </div>
        </article>
      ) : (
        <article className="print-card flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <h2 className="font-display truncate text-[14px] font-semibold text-[#111114]">
              Potencjał 4 sfer
            </h2>
            <span className="font-mono shrink-0 text-[10px] tabular-nums text-zinc-500">
              1–10
            </span>
          </div>

          <div className="my-3 grid grid-cols-4 items-end gap-2 pt-2">
            {report.sphereScores.map((sphere) => {
              const barH = Math.max(36, sphere.scoreOutOf10 * 9.5);
              return (
                <div key={sphere.id} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-zinc-500">{sphere.label}</span>
                  <div
                    style={{ height: `${barH}px` }}
                    className="hatch-pattern w-full rounded-lg border border-zinc-200 bg-zinc-50"
                  />
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[#111114]">
                    {sphere.scoreOutOf10}/10
                  </span>
                </div>
              );
            })}
          </div>

          <p className="border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-500">
            Faza startu: <span className="font-medium text-[#111114]">{report.ephemeris.lunarPhaseAtReturn}</span>
          </p>
        </article>
      )}
    </section>
  );
}
