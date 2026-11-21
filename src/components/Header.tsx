import { useEffect, useState } from 'react';
import { ArrowLeft, Home, Menu, X } from 'lucide-react';

export type AppView = 'landing' | 'funnel' | 'calculating' | 'report';
export type NavSectionId = 'start' | 'co-dostajesz' | 'przyklady' | 'zgodnosc' | 'artykuly';

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
  { id: 'przyklady', label: 'Przykłady' },
  { id: 'zgodnosc', label: 'Zgodność' },
  { id: 'artykuly', label: 'Analizy' },
];

function BrandGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-white"
    >
      <rect x="3" y="4" width="3.5" height="3.5" rx="1" fill="currentColor" />
      <rect x="8.25" y="4" width="3.5" height="3.5" rx="1" fill="currentColor" fillOpacity="0.65" />
      <rect x="13.5" y="4" width="3.5" height="3.5" rx="1" fill="currentColor" />
      <rect x="5.5" y="8.5" width="3.5" height="3.5" rx="1" fill="currentColor" />
      <rect x="11" y="8.5" width="3.5" height="3.5" rx="1" fill="currentColor" fillOpacity="0.8" />
      <rect x="3" y="13" width="3.5" height="3.5" rx="1" fill="currentColor" fillOpacity="0.7" />
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handleNavClick = (id: NavSectionId) => {
    onSelectNav(id);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0B0B0D]/65 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-[72px] md:gap-8 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#hero-top"
          onClick={(event) => {
            event.preventDefault();
            onBackToLanding();
          }}
          className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35]"
        >
          <BrandGlyph />
          <span className="font-display text-[17px] font-semibold tracking-[-0.02em] sm:text-lg">
            Solaris
          </span>
        </a>

        {/* Zone 2: Center Floating Glass Pill Nav (Landing) or Context Step Link */}
        {view === 'landing' ? (
          <nav
            aria-label="Nawigacja główna"
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.05] p-1 backdrop-blur-md md:flex"
          >
            {NAV_LINKS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] ${
                    isActive
                      ? 'bg-white/[0.12] text-white'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {item.id === 'start' && (
                    <Home className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden items-center gap-2 text-xs text-[#9A9AA3] md:flex">
            <span className="font-mono uppercase tracking-[0.08em] text-[#B4B4BE]">
              {view === 'funnel' && 'Kalkulator Solariusza 2027'}
              {view === 'calculating' && 'Silnik efemeryd 2027'}
              {view === 'report' && 'Twoja Matryca 2027'}
            </span>
          </div>
        )}

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex shrink-0 items-center gap-2">
          {view === 'landing' ? (
            hasSavedReport ? (
              <button
                type="button"
                onClick={onOpenSavedReport}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#FF5C35]/70 bg-[#FF5C35]/15 px-4 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#FF5C35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] sm:px-5 sm:text-[13px]"
              >
                Twój raport
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartFunnel}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white transition-colors duration-150 hover:border-[#FF5C35] hover:bg-[#FF5C35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] sm:px-5 sm:text-[13px]"
              >
                Sprawdź 2027
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.15] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-[#D4D4DC] transition-colors duration-150 hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] sm:px-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Strona główna</span>
            </button>
          )}

          {view === 'landing' && (
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white transition-colors duration-150 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {view === 'landing' && menuOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="false"
          aria-label="Menu mobilne"
          className="border-t border-white/[0.08] bg-[#111114]/98 px-4 pb-5 pt-2 backdrop-blur-xl md:hidden"
        >
          <nav aria-label="Sekcje strony" className="flex flex-col divide-y divide-white/[0.06]">
            {NAV_LINKS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex min-h-[48px] w-full items-center justify-between text-left text-[15px] font-medium transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-[#A1A1AA]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="font-mono text-[11px] text-[#FF5C35]">Aktywne</span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onStartFunnel();
            }}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#FF5C35] px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6D4A]"
          >
            Sprawdź swój 2027
          </button>
        </div>
      )}
    </header>
  );
}
