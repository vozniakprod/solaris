import { ArrowLeft } from 'lucide-react';

export type AppView = 'landing' | 'funnel' | 'calculating' | 'report';
export type NavSectionId = 'start' | 'co-dostajesz' | 'jak-to-dziala';

interface HeaderProps {
  view: AppView;
  activeNav: NavSectionId;
  hasSavedReport: boolean;
  onSelectNav: (id: NavSectionId) => void;
  onStartFunnel: () => void;
  onBackToLanding: () => void;
  onOpenSavedReport: () => void;
}

const NAV_LINKS: ReadonlyArray<{ id: NavSectionId; label: string }> = [
  { id: 'start', label: 'Start' },
  { id: 'co-dostajesz', label: 'Co dostajesz' },
  { id: 'jak-to-dziala', label: 'Jak to działa' },
];

function BrandGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#111114]"
    >
      <rect x="3" y="4" width="3.5" height="3.5" rx="1" fill="currentColor" />
      <rect x="8.25" y="4" width="3.5" height="3.5" rx="1" fill="#E84A27" />
      <rect x="13.5" y="4" width="3.5" height="3.5" rx="1" fill="currentColor" />
      <rect x="5.5" y="8.5" width="3.5" height="3.5" rx="1" fill="currentColor" />
      <rect x="11" y="8.5" width="3.5" height="3.5" rx="1" fill="currentColor" fillOpacity="0.65" />
      <rect x="3" y="13" width="3.5" height="3.5" rx="1" fill="currentColor" fillOpacity="0.55" />
      <rect x="8.25" y="13" width="3.5" height="3.5" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Header({
  view,
  activeNav,
  hasSavedReport,
  onSelectNav,
  onStartFunnel,
  onBackToLanding,
  onOpenSavedReport,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-4 sm:px-6 md:h-16 md:gap-8">
        {/* Zone 1: Clean Brand Wordmark */}
        <a
          href="#hero-top"
          onClick={(event) => {
            event.preventDefault();
            onBackToLanding();
          }}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg text-[#111114] transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]"
        >
          <BrandGlyph />
          <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">
            Solaris 2027
          </span>
        </a>

        {/* Zone 2: Minimalist Single-Line Navigation */}
        {view === 'landing' ? (
          <nav
            aria-label="Nawigacja główna"
            className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex"
          >
            {NAV_LINKS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectNav(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] ${
                    isActive
                      ? 'text-[#111114] underline decoration-[#E84A27] decoration-2 underline-offset-8'
                      : 'hover:text-[#111114]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden items-center text-xs font-medium text-zinc-500 md:flex">
            {view === 'funnel' && 'Krok po kroku · Solariusz 2027'}
            {view === 'calculating' && 'Obliczanie raportu 2027'}
            {view === 'report' && 'Twój raport Solaris 2027'}
          </div>
        )}

        {/* Zone 3: Single Primary Action */}
        <div className="flex shrink-0 items-center">
          {view === 'landing' ? (
            hasSavedReport ? (
              <button
                type="button"
                onClick={onOpenSavedReport}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#E84A27] px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] sm:px-5 sm:text-[13px]"
              >
                Twój raport
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartFunnel}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#111114] px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] sm:px-5 sm:text-[13px]"
              >
                Oblicz 2027
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors duration-150 hover:border-zinc-300 hover:text-[#111114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] sm:px-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Strona główna</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
