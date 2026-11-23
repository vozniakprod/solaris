import { useState } from 'react';
import { ArrowUp, ArrowUpRight, Calendar, Check, FileText, ShieldCheck } from 'lucide-react';
import type { FunnelMode } from '../utils/solarisPricing';
import {
  LEGAL_TEXTS,
  SELLER_LEGAL_CONFIG,
  type LegalDocId,
} from '../data/legalDocuments';

interface LandingSectionsProps {
  onStartFunnel: (mode: FunnelMode) => void;
  onOpenLegal: (doc: LegalDocId) => void;
  onOpenCookieSettings: () => void;
  onSaveNewsletterEmail: (
    email: string,
    marketingConsent: boolean,
  ) => Promise<{ ok: boolean; message: string }>;
}

const DELIVERABLES = [
  {
    num: '01',
    title: '3 kluczowe daty i oś 12 miesięcy',
    description:
      'Konkretne przedziały na 2027 rok: miesiące największego wzrostu oraz okresy ostrożności w finansach i relacjach.',
    icon: Calendar,
  },
  {
    num: '02',
    title: 'Konkretne kroki i czerwone flagi',
    description:
      'Bez ogólników — w każdym obszarze dostajesz 3 zalecane ruchy, listę ryzyk do uniknięcia oraz wariant Solo lub Dla pary.',
    icon: Check,
  },
  {
    num: '03',
    title: 'Raport na e-mail, PDF A4 i plik .ics',
    description:
      'Natychmiastowy dostęp na stronie, pełna kopia na skrzynkę e-mail oraz 12 okien dat prosto do Apple i Google Calendar.',
    icon: FileText,
  },
] as const;

export function LandingSections({
  onStartFunnel,
  onOpenLegal,
  onOpenCookieSettings,
  onSaveNewsletterEmail,
}: LandingSectionsProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'idle' | 'ok' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });

  const focusHeroBirthDate = () => {
    const input = document.getElementById('hero-birth-date') as HTMLInputElement | null;
    if (input) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => input.focus(), 350);
    } else {
      onStartFunnel('solo');
    }
  };

  const handleNewsletterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newsletterConsent) {
      setNewsletterStatus({
        type: 'error',
        text: 'Zaznacz dobrowolną zgodę na otrzymywanie wiadomości e-mail.',
      });
      return;
    }
    const res = await onSaveNewsletterEmail(newsletterEmail, newsletterConsent);
    setNewsletterStatus({ type: res.ok ? 'ok' : 'error', text: res.message });
    if (res.ok) {
      setNewsletterEmail('');
      setNewsletterConsent(false);
    }
  };

  return (
    <>
      {/* SECTION 1: Minimalist Deliverables (3 crisp columns, zero visual noise) */}
      <section
        id="co-dostajesz"
        className="border-t border-zinc-200/80 bg-white px-4 py-14 sm:px-6 sm:py-16"
      >
        <div className="mx-auto max-w-5xl">
          <div className="max-w-xl">
            <p className="font-mono text-xs font-medium text-zinc-500">
              Co zawiera raport Solaris 2027
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#111114] sm:text-3xl">
              Konkretny plan na 2027 zamiast ogólnych horoskopów
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {DELIVERABLES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.num}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-6"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium text-zinc-400">
                        {item.num}
                      </span>
                      <Icon className="h-4 w-4 text-[#E84A27]" aria-hidden="true" />
                    </div>
                    <h3 className="font-display mt-4 text-base font-semibold text-[#111114]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 2: Simple 3-Step Flow & Transparent Pricing -> Back to Calculator */}
      <section
        id="jak-to-dziala"
        className="border-t border-zinc-200/80 bg-[#FAFAFA] px-4 py-14 sm:px-6 sm:py-16"
      >
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgba(17,17,20,0.04)] sm:p-10">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="font-mono text-xs font-medium text-zinc-500">
                  Proste zasady · Bez subskrypcji
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#111114] sm:text-3xl">
                  Najpierw widzisz darmowy skrót, potem decydujesz
                </h2>

                <ol className="mt-6 space-y-3.5 text-sm text-zinc-700">
                  <li className="flex items-start gap-3">
                    <span className="font-mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-[#111114]">
                      1
                    </span>
                    <span>
                      <strong className="font-semibold text-[#111114]">
                        Wpisujesz datę urodzenia i odpowiadasz na 5 pytań
                      </strong>{' '}
                      — zajmuje to mniej niż 60 sekund, bez zakładania konta.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-[#111114]">
                      2
                    </span>
                    <span>
                      <strong className="font-semibold text-[#111114]">
                        Otrzymujesz bezpłatny podgląd 2027
                      </strong>{' '}
                      z wykresem roku, miesiącem wzrostu i pierwszym sygnałem ostrzegawczym.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-[#111114]">
                      3
                    </span>
                    <span>
                      <strong className="font-semibold text-[#111114]">
                        Odblokowujesz tylko to, czego potrzebujesz
                      </strong>{' '}
                      — od 14,99 zł za 1 obszar lub 44,99 zł za cały pakiet 2027 z kalendarzem .ics i PDF A4 gratis.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-6 lg:col-span-5">
                <p className="text-xs font-medium text-zinc-500">Jednorazowy dostęp</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tabular-nums text-[#111114]">
                    od 14,99 zł
                  </span>
                  <span className="text-xs text-zinc-500">brutto</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  Pełny pakiet (wszystkie sfery + kalendarz .ics + PDF A4):{' '}
                  <strong className="font-mono text-[#111114]">44,99 zł</strong>. Zero ukrytych opłat.
                </p>

                <button
                  type="button"
                  onClick={focusHeroBirthDate}
                  className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D]"
                >
                  <span>Wpisz datę urodzenia</span>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>BLIK · Apple Pay · Google Pay · Karta (Stripe)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MINIMALIST LIGHT FOOTER */}
      <footer className="border-t border-zinc-200 bg-white px-4 pb-12 pt-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 pb-8 md:grid-cols-2">
            <div>
              <p className="font-display text-sm font-semibold text-[#111114]">
                Solaris 2027 · Kontakt i Sprzedawca
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                Sprzedawca: {SELLER_LEGAL_CONFIG.sellerName} · Adres:{' '}
                {SELLER_LEGAL_CONFIG.sellerAddress}
                {SELLER_LEGAL_CONFIG.sellerNip ? ` · ${SELLER_LEGAL_CONFIG.sellerNip}` : ''}.
              </p>
              <a
                href={`mailto:${SELLER_LEGAL_CONFIG.contactEmail}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#111114] underline decoration-zinc-300 underline-offset-4 hover:text-[#E84A27]"
              >
                <span>{SELLER_LEGAL_CONFIG.contactEmail}</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#111114]">
                Nie chcesz teraz sprawdzać? Zostaw e-mail po przypomnienie i rabat -20%
              </p>
              <form onSubmit={handleNewsletterSubmit} noValidate className="mt-2.5 space-y-2.5">
                <div className="flex gap-2">
                  <label htmlFor="footer-reminder-email" className="sr-only">
                    Adres e-mail
                  </label>
                  <input
                    id="footer-reminder-email"
                    type="email"
                    placeholder="twoj@email.pl"
                    value={newsletterEmail}
                    onChange={(event) => setNewsletterEmail(event.target.value)}
                    className="min-h-[42px] flex-1 rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-[#111114] placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-xl bg-[#111114] px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    Zapisz
                  </button>
                </div>

                {/* Separate UNCHECKED marketing consent checkbox */}
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(e) => {
                      setNewsletterConsent(e.target.checked);
                      if (newsletterStatus.type === 'error') {
                        setNewsletterStatus({ type: 'idle', text: '' });
                      }
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#E84A27]"
                  />
                  <span>
                    {LEGAL_TEXTS.checkbox4Marketing} Szczegóły w{' '}
                    <a
                      href="/polityka-prywatnosci"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenLegal('polityka');
                      }}
                      className="text-zinc-700 underline hover:text-[#111114]"
                    >
                      Polityce prywatności
                    </a>
                    .
                  </span>
                </label>

                {newsletterStatus.type !== 'idle' && (
                  <p
                    role="status"
                    className={`text-xs font-medium ${
                      newsletterStatus.type === 'ok' ? 'text-emerald-700' : 'text-[#C83717]'
                    }`}
                  >
                    {newsletterStatus.text}
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-6 text-xs text-zinc-500 lg:flex-row lg:items-center">
            <nav aria-label="Linki prawne" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href="/regulamin"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal('regulamin');
                }}
                className="inline-flex min-h-[36px] items-center hover:text-[#111114]"
              >
                Regulamin
              </a>
              <a
                href="/polityka-prywatnosci"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal('polityka');
                }}
                className="inline-flex min-h-[36px] items-center hover:text-[#111114]"
              >
                Polityka prywatności
              </a>
              <a
                href="/polityka-cookies"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal('cookies');
                }}
                className="inline-flex min-h-[36px] items-center hover:text-[#111114]"
              >
                Polityka cookies
              </a>
              <a
                href="/odstapienie"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal('odstapienie');
                }}
                className="inline-flex min-h-[36px] items-center hover:text-[#111114]"
              >
                Odstąpienie od umowy
              </a>
              <button
                type="button"
                onClick={onOpenCookieSettings}
                className="inline-flex min-h-[36px] items-center hover:text-[#111114]"
              >
                Ustawienia cookies
              </button>
              <a
                href={`mailto:${SELLER_LEGAL_CONFIG.contactEmail}`}
                className="inline-flex min-h-[36px] items-center hover:text-[#111114]"
              >
                Kontakt
              </a>
            </nav>

            <div className="max-w-md space-y-1 text-[11px] leading-relaxed text-zinc-500 lg:text-right">
              <p>{LEGAL_TEXTS.footerShortDisclaimer}</p>
              <p>Dane geograficzne: GeoNames.org</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
