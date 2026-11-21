import { useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { FunnelMode } from '../utils/solarisPricing';
import {
  LEGAL_TEXTS,
  SELLER_LEGAL_CONFIG,
  type LegalDocId,
} from '../data/legalDocuments';

import PORTRAIT_IMG from '../assets/images/editorial_warsaw_portrait_1795221168412.jpg';
import ARTICLE_FINANCE_IMG from '../assets/images/article_finance_2027_1795221167161.jpg';
import ARTICLE_RELATIONS_IMG from '../assets/images/article_relations_2027_1795221168205.jpg';
import ARTICLE_DECISIONS_IMG from '../assets/images/article_decisions_2027_1795221167714.jpg';

interface LandingSectionsProps {
  onStartFunnel: (mode: FunnelMode) => void;
  onOpenLegal: (doc: LegalDocId) => void;
  onOpenCookieSettings: () => void;
  onSaveNewsletterEmail: (
    email: string,
    marketingConsent: boolean,
  ) => Promise<{ ok: boolean; message: string }>;
}

interface EditorialArticle {
  id: string;
  author: string;
  date: string;
  title: string;
  excerpt: string;
  body: string[];
  image: string;
  imageAlt: string;
  recommendedMode: FunnelMode;
}

const EDITORIAL_ARTICLES: readonly EditorialArticle[] = [
  {
    id: 'finanse-maj',
    author: 'Redakcja Solaris',
    date: 'Analiza 2027',
    title: 'Dlaczego w połowie 2027 roku część osób straci poduszkę finansową przez jedną pochopną decyzję?',
    excerpt:
      'Presja zmiany pracy lub kosztowny kredyt pod wpływem zmęczenia to częsty błąd przed przełomowym kwartałem. Sprawdź, jak wyznaczyć swoje okna ostrożności.',
    body: [
      'Wiele niekorzystnych decyzji finansowych wynika nie z braku kompetencji, lecz ze złego timingu i działania pod wpływem zmęczenia. W raporcie Solaris 2027 rozdzielamy miesiące o wyższym potencjale inicjatywy od okresów, w których warto zachować większą ostrożność przy umowach i wydatkach stałych.',
      'Zamiast ogólnych haseł dostajesz uporządkowane okresy na cały rok, konkretne pytania kontrolne oraz kalendarz, który pomaga lepiej zaplanować ważne rozmowy.',
    ],
    image: ARTICLE_FINANCE_IMG,
    imageAlt: 'Czarny laptop, notatnik i espresso na jasnym kamiennym biurku w porannym świetle',
    recommendedMode: 'solo',
  },
  {
    id: 'relacje-kryzys',
    author: 'Redakcja Solaris',
    date: 'Relacje 2027',
    title: 'Dlaczego w 2027 roku w niektórych relacjach pojawi się kryzys, a inne wejdą na nowy poziom?',
    excerpt:
      'Konflikty rzadko biorą się z braku zaangażowania. Częściej chodzi o rozjazd tempa decyzji, budżetu i granic w jednym konkretnym okresie roku.',
    body: [
      'Gdy dwie osoby wchodzą w różne fazy roku — jedna przyspiesza zawodowo, a druga ma okres przeciążenia — zwykła rozmowa o planach potrafi zamienić się w niepotrzebne tarcie.',
      'Wariant „Dla dwojga” w Solaris 2027 zestawia dane obu osób i pokazuje przykładowy indeks zgodności (68%–94%), okresy wspólnego rytmu oraz miesiące, w których warto rozmawiać szczególnie spokojnie i konkretnie.',
    ],
    image: ARTICLE_RELATIONS_IMG,
    imageAlt: 'Para rozmawiająca przy stoliku kawiarnianym w świetle dziennym',
    recommendedMode: 'pair',
  },
  {
    id: 'przeprowadzka-zmiana',
    author: 'Redakcja Solaris',
    date: 'Decyzje 2027',
    title: 'Zmiana branży albo przeprowadzka w 2027: 3 sygnały z raportu, na które warto zwrócić uwagę',
    excerpt:
      'Odkładanie decyzji miesiącami męczy bardziej niż samo działanie. Sprawdź, które kwartały 2027 sprzyjają logistyce, a które lepiej poświęcić na przygotowania.',
    body: [
      'W przeglądzie roku wyraźnie widać różnicę między kwartałem porządkowania a okresem otwierania nowych projektów. Dobre przygotowanie formalności przed okresem wzmożonego tempa oszczędza czas i nerwy.',
      'Do pełnego pakietu dołączamy plik .ics do Apple i Google Calendar z 12 oknami dat — widzisz je bezpośrednio w swoim codziennym kalendarzu.',
    ],
    image: ARTICLE_DECISIONS_IMG,
    imageAlt: 'Osoba z telefonem z widokiem kalendarza przy oknie nad miastem o zmierzchu',
    recommendedMode: 'solo',
  },
];

// Honest sample excerpts (replaces fabricated reviews per P0.4)
const SAMPLE_REPORT_EXCERPTS = [
  {
    section: 'Moduł 01 · Finanse i Kariera',
    badge: 'Przykład — nie jest opinią klienta',
    title: 'Okno rozmów o stawkach vs tygodnie ostrożności',
    excerpt:
      '„Możliwy okres większej sprawczości przypada między 11 a 27 maja 2027. Z kolei w drugim tygodniu października warto zachować ostrożność przy podpisywaniu zobowiązań długoterminowych i dać sobie 48 godzin na chłodną weryfikację warunków.”',
    meta: 'Dane poglądowe · Format modułu PDF / web',
    featured: false,
  },
  {
    section: 'Moduł 05 · Zgodność dla dwojga',
    badge: 'Przykład — nie jest opinią klienta',
    title: 'Wspólny rytm decyzji i punkt tarcia w komunikacji',
    excerpt:
      '„W trybie dla dwojga raport wskazuje okres, w którym łatwiej domknąć wspólny budżet lub plany wyjazdowe, oraz tydzień podwyższonego tarcia, gdy różne tempo reakcji pod presją wymaga prostych, spisanych ustaleń zamiast domysłów.”',
    meta: 'Dane poglądowe · Para / Przyjaciele / Biznes',
    featured: true,
  },
  {
    section: 'Dodatek · Kalendarz .ics (12 okien)',
    badge: 'Przykład — nie jest opinią klienta',
    title: 'Krótka checklista przypięta do konkretnego tygodnia',
    excerpt:
      '„Każde z 12 okien w pliku .ics zawiera przedział dat oraz 2–3 zdania podsumowania do refleksji: na czym warto się skupić, a z jakimi decyzjami lepiej poczekać. Import do Google Calendar i Apple Calendar zajmuje 10 sekund.”',
    meta: 'Dane poglądowe · Eksport RFC 5545 (.ics)',
    featured: false,
  },
] as const;

export function LandingSections({
  onStartFunnel,
  onOpenLegal,
  onOpenCookieSettings,
  onSaveNewsletterEmail,
}: LandingSectionsProps) {
  const [activeArticle, setActiveArticle] = useState<EditorialArticle | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'idle' | 'ok' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });
  const [articleOffset, setArticleOffset] = useState(0);
  const [portraitBroken, setPortraitBroken] = useState(false);

  const orderedArticles = [
    EDITORIAL_ARTICLES[articleOffset % EDITORIAL_ARTICLES.length],
    EDITORIAL_ARTICLES[(articleOffset + 1) % EDITORIAL_ARTICLES.length],
    EDITORIAL_ARTICLES[(articleOffset + 2) % EDITORIAL_ARTICLES.length],
  ];

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
      {/* SECTION 2: Warm Sand Rounded Container (Exact Figma IMG_1429 bottom block) */}
      <section id="co-dostajesz" className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-[#D6D1C4] px-4 py-10 text-[#111114] sm:rounded-[34px] sm:px-8 sm:py-14 lg:px-12 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,3.6vw,2.9rem)] font-medium leading-[1.12] tracking-[-0.025em] text-[#111114]">
              Konkretny Przegląd 2027
              <br />
              Zamiast Ogólnych Horoskopów
            </h2>
            <p className="mx-auto mt-3.5 max-w-lg text-sm leading-relaxed text-[#4A4842] sm:text-[15px]">
              Łączymy obliczenia Solariusza na podstawie Twoich danych z krótkim quizem
              decyzyjnym. Wybierasz tylko te obszary, które chcesz sprawdzić.
            </p>
          </div>

          {/* 3 High-Contrast Dark Cards matching Figma exactly (all examples clearly labeled) */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:mt-11 lg:grid-cols-3">
            {/* Left Dark Card (Figma: Top Clients -> Labeled Sample Profiles) */}
            <article className="flex flex-col justify-between rounded-[22px] bg-[#111114] p-5 text-white sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-white">
                    Warianty raportu
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-[#9A9AA3]">
                    Przykład
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8E8E98]">
                  Sprawdź profil dla siebie albo zestaw daty urodzenia dwóch osób — w relacji, przyjaźni lub współpracy.
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    { code: '01', name: 'Profil Solo (przykład)', sub: 'Finanse i Kariera · Dane poglądowe', tag: 'Solo' },
                    { code: '02', name: 'Profil Para (przykład)', sub: 'Indeks 87% · Dane poglądowe', tag: 'Para' },
                    { code: '03', name: 'Profil Biznes (przykład)', sub: 'Wspólne decyzje · Dane poglądowe', tag: 'Biznes' },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#242429] font-mono text-[11px] font-medium text-[#E4E4EA]">
                          {row.code}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{row.name}</p>
                          <p className="truncate text-[11px] text-[#7D7D87]">{row.sub}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#D8B4FE] px-2.5 py-0.5 text-[10px] font-semibold text-[#111114]">
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Center Dark Visual Card (Fixed fallback, explicit dimensions, zero fake quote!) */}
            <article className="flex flex-col justify-between overflow-hidden rounded-[22px] bg-[#111114] p-5 text-white sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-white">
                    Bez lania wody, prosto w daty
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-[#9A9AA3]">
                    Podgląd
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8E8E98]">
                  Zamiast pustych haseł dostajesz 12-miesięczną oś energii i ostrożności oraz listę konkretnych pytań do przemyślenia.
                </p>
              </div>

              <div className="relative mt-5 h-[196px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#23232A] via-[#1A1A20] to-[#121216]">
                {!portraitBroken ? (
                  <img
                    src={PORTRAIT_IMG}
                    width={640}
                    height={392}
                    loading="lazy"
                    decoding="async"
                    onError={() => setPortraitBroken(true)}
                    alt="Ilustracja redakcyjna raportu Solaris 2027"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col justify-between p-4">
                    <span className="font-mono text-[10px] uppercase text-[#D8B4FE]">
                      Solariusz 2027 · Oś 12 miesięcy
                    </span>
                    <div className="grid grid-cols-6 items-end gap-1.5 h-20">
                      {[52, 68, 86, 74, 48, 80].map((v, i) => (
                        <div
                          key={i}
                          style={{ height: `${v}%` }}
                          className="rounded-t-md bg-white/25"
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111114]/92 via-[#111114]/25 to-transparent"
                />
                <div className="absolute inset-x-3 bottom-3 text-center">
                  <p className="text-xs font-semibold text-white">
                    Przykładowy układ raportu 2027
                  </p>
                  <p className="font-mono text-[10px] text-[#C4C4CE]">
                    Dane poglądowe · Wersja mobilna, A4 PDF i plik .ics
                  </p>
                </div>
              </div>
            </article>

            {/* Right Dark Hatched Progress Card (Figma: Task Progress — clearly marked Przykład) */}
            <article className="flex flex-col justify-between rounded-[22px] bg-[#111114] p-5 text-white sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-white">
                    Modułowy raport A4 + .ics
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-[#9A9AA3]">
                    Przykład
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8E8E98]">
                  Odblokowujesz jedną sferę od 14,99 zł albo cały pakiet 2027 z kalendarzem do telefonu gratis.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 items-end gap-3 pt-2">
                {[
                  { label: 'Finanse', ratio: '8/10', height: 'h-[116px]' },
                  { label: 'Decyzje', ratio: '9/10', height: 'h-[144px]' },
                  { label: 'Relacje', ratio: '7/10', height: 'h-[98px]' },
                ].map((bar) => (
                  <div key={bar.label} className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-medium text-[#A1A1AA]">{bar.label}</span>
                    <div
                      className={`hatch-pattern w-full rounded-xl border border-white/15 bg-white/[0.04] ${bar.height}`}
                    />
                    <span className="font-mono text-[11px] tabular-nums text-[#D4D4DC]">
                      {bar.ratio}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center font-mono text-[10px] text-[#7D7D87]">
                Dane poglądowe · skala orientacyjna 1–10
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* SECTION 3: Honest Sample Report Excerpts (Replaces ALL fake reviews per P0.4!) */}
      <section id="przyklady" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(1.75rem,3.6vw,2.85rem)] font-medium leading-[1.12] tracking-[-0.025em]">
            <span className="text-[#8E8E95]">Przykładowy Fragment </span>
            <span className="text-white">Raportu</span>
            <br />
            <span className="text-[#8E8E95]">Zanim </span>
            <span className="text-white">Zdecydujesz</span>
          </h2>
          <p className="mt-3 text-xs text-[#9A9AA3] sm:text-sm">
            Poniższe karty pokazują styl i strukturę treści w Solaris 2027. Każdy fragment jest materiałem poglądowym.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {SAMPLE_REPORT_EXCERPTS.map((item) => (
            <article
              key={item.section}
              className={`flex flex-col justify-between rounded-[22px] border p-6 text-left transition-colors duration-150 ${
                item.featured
                  ? 'border-white/[0.16] bg-[#141418]'
                  : 'border-white/[0.06] bg-[#101013]'
              }`}
            >
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-[#D8B4FE]">
                  {item.badge}
                </p>
                <h3 className="font-display mt-2 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#D4D4DC]">
                  {item.excerpt}
                </p>
              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-semibold text-white">{item.section}</p>
                <p className="mt-0.5 text-[11px] text-[#7D7D87]">{item.meta}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Monochrome Capability & Payment Strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-white/[0.06] py-6 text-xs font-medium tracking-[0.04em] text-[#7A7A84] sm:gap-x-12 sm:text-sm">
          <span>SOLARIUSZ 2027</span>
          <span>OBLICZENIA IANA TZ</span>
          <span>STRIPE · BLIK &amp; KARTA</span>
          <span>KALENDARZ .ICS</span>
          <span>RAPORT A4 PDF</span>
        </div>
      </section>

      {/* SECTION 4: Asymmetric Flanking Analytics Split (Exact Figma IMG_1430 middle — Labeled Examples!) */}
      <section id="zgodnosc" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          {/* Left Floating Warm-Ivory Analytics Card */}
          <article className="rounded-[22px] bg-[#F5F3EC] p-5 text-[#111114] lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-[#111114]">
                Rytm decyzji 2027
              </h3>
              <span className="font-mono text-[10px] uppercase text-[#6B6B73]">
                Przykład
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#6B6B73]">
              Dane poglądowe · rozkład miesięcy
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
              <div>
                <p className="font-semibold text-[#111114]">7 mies.</p>
                <p className="text-[10px] text-[#6B6B73]">Wzrost</p>
              </div>
              <div>
                <p className="font-semibold text-[#111114]">3 mies.</p>
                <p className="text-[10px] text-[#6B6B73]">Stabilne</p>
              </div>
              <div>
                <p className="font-semibold text-[#111114]">2 mies.</p>
                <p className="text-[10px] text-[#6B6B73]">Ostrożność</p>
              </div>
            </div>
            <div className="mt-5 flex h-24 items-end justify-between gap-2">
              {[58, 72, 92, 80, 44].map((val, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    style={{ height: `${val}%` }}
                    className={`w-full rounded-t-md border-t-2 border-[#111114] ${
                      idx === 2 ? 'bg-[#C084FC]/60' : 'bg-[#D8B4FE]/65'
                    }`}
                  />
                  <span className="font-mono text-[9px] text-[#6B6B73]">
                    {['Mar', 'Kwi', 'Maj', 'Cze', 'Paź'][idx]}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* Center Pain -> Fact Hook */}
          <div className="text-center lg:col-span-6 lg:px-6">
            <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.75rem)] font-medium leading-[1.12] tracking-[-0.025em]">
              <span className="text-[#8E8E95]">Dlaczego Jedne Relacje </span>
              <span className="text-white">Rosną,</span>
              <br />
              <span className="text-[#8E8E95]">A Inne </span>
              <span className="text-white">Pękają W 2027?</span>
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#D4D4DC]">
              Dlaczego w 2027 roku w niektórych relacjach pojawi się kryzys, a inne wejdą na nowy poziom?
              Sprawdź waszą matrycę w 2 minuty.
            </p>
            <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-[#8E8E98]">
              Wpisujesz tylko niezbędne dane obu osób (imię lub pseudonim, datę i miejsce urodzenia; godzina jest opcjonalna).
              Bez wysyłania linków, bez logowania — od razu widzisz darmowy skrót.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onStartFunnel('pair')}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#FF5C35] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B] sm:w-auto"
              >
                <span>Sprawdź matrycę dla dwojga</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onStartFunnel('solo')}
                className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full border border-white/15 px-5 py-2 text-xs font-medium text-[#D4D4DC] transition-colors duration-150 hover:border-white/35 hover:text-white"
              >
                Albo sprawdź tylko siebie
              </button>
            </div>
          </div>

          {/* Right Floating Pastel Lavender Donut Card (Clearly labeled Dane poglądowe — NO fake names!) */}
          <article className="rounded-[22px] bg-[#E9D5FF] p-5 text-[#111114] lg:col-span-3">
            <h3 className="font-display text-center text-sm font-semibold text-[#111114]">
              Zgodność 2027 (Przykład)
            </h3>
            <p className="mt-0.5 text-center text-[11px] text-[#4B3F5C]">
              Dane poglądowe · przykładowy profil pary
            </p>

            <div className="my-4 flex justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(17,17,20,0.12)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#111114"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="32.6"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-xl font-bold tabular-nums text-[#111114]">
                    87%
                  </span>
                  <span className="text-[10px] text-[#4B3F5C]">Przykład</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-[#111114]/10 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#4B3F5C]">Decyzje i finanse</span>
                <span className="font-mono font-semibold tabular-nums">91%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4B3F5C]">Komunikacja w stresie</span>
                <span className="font-mono font-semibold tabular-nums">79%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4B3F5C]">Wspólny rytm 2027</span>
                <span className="font-mono font-semibold tabular-nums">88%</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* SECTION 5: Warm Sand Editorial Insights Block (Exact Figma IMG_1431 top) */}
      <section id="artykuly" className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-[#D6D1C4] px-4 py-10 text-[#111114] sm:rounded-[34px] sm:px-8 sm:py-14 lg:px-12">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-[clamp(1.65rem,3.3vw,2.6rem)] font-medium leading-[1.12] tracking-[-0.025em] text-[#111114]">
                O Czym Milczą Ogólne
                <br />
                Opisy Na 2027 Rok
              </h2>
              <p className="mt-2.5 max-w-md text-xs leading-relaxed text-[#4A4842] sm:text-sm">
                Krótkie notatki redakcyjne o pieniądzach, relacjach i trudnych miesiącach 2027.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setArticleOffset(
                    (prev) => (prev - 1 + EDITORIAL_ARTICLES.length) % EDITORIAL_ARTICLES.length,
                  )
                }
                aria-label="Poprzedni artykuł"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C20] text-white transition-opacity duration-150 hover:opacity-85"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setArticleOffset((prev) => (prev + 1) % EDITORIAL_ARTICLES.length)}
                aria-label="Następny artykuł"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5C35] text-white transition-colors duration-150 hover:bg-[#FF6E4B]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {orderedArticles.map((art) => (
              <article key={art.id} className="flex flex-col justify-between">
                <div>
                  <div className="overflow-hidden rounded-2xl bg-[#C5C0B3]">
                    <img
                      src={art.image}
                      width={640}
                      height={480}
                      loading="lazy"
                      decoding="async"
                      alt={art.imageAlt}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#524F48]">
                    <span>{art.author}</span>
                    <span className="font-mono">{art.date}</span>
                  </div>
                  <h3 className="font-display mt-2 text-lg font-semibold leading-snug text-[#111114]">
                    {art.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#4A4842]">{art.excerpt}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveArticle(art)}
                  className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 self-start text-xs font-semibold text-[#111114] underline decoration-[#111114]/35 underline-offset-4 transition-colors duration-150 hover:text-[#FF5C35] hover:decoration-[#FF5C35]"
                >
                  <span>Czytaj całość</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER (Exact Figma IMG_1431 bottom + full legal links, seller info, GeoNames attribution, marketing opt-in) */}
      <footer className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="font-display text-[clamp(2.5rem,9vw,6.8rem)] font-bold leading-none tracking-[-0.04em] text-[#D8D8DF]">
            ©SOLARIS — 2027
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 border-t border-white/[0.08] pt-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-white">Kontakt i dane Sprzedawcy</p>
            <div className="mt-3 space-y-2.5 text-sm text-[#B4B4BE]">
              <a
                href={`mailto:${SELLER_LEGAL_CONFIG.contactEmail}`}
                className="flex items-center justify-between border-b border-white/[0.08] pb-2 transition-colors hover:text-white"
              >
                <span>{SELLER_LEGAL_CONFIG.contactEmail}</span>
                <ArrowUpRight className="h-4 w-4 text-[#7D7D87]" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => onStartFunnel('solo')}
                className="flex w-full items-center justify-between border-b border-white/[0.08] pb-2 text-left transition-colors hover:text-white"
              >
                <span>Oblicz darmowy podgląd na 2027 rok</span>
                <ArrowUpRight className="h-4 w-4 text-[#7D7D87]" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#7D7D87]">
              Sprzedawca: {SELLER_LEGAL_CONFIG.sellerName} · Adres: {SELLER_LEGAL_CONFIG.sellerAddress}
              {SELLER_LEGAL_CONFIG.sellerNip ? ` · ${SELLER_LEGAL_CONFIG.sellerNip}` : ''}. Ceny w PLN brutto (od 14,99 zł do 44,99 zł za pełny pakiet).
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-white">
              Nie chcesz teraz robić quizu? Zostaw e-mail po przypomnienie i rabat -20%
            </p>
            <form onSubmit={handleNewsletterSubmit} noValidate className="mt-3 space-y-2.5">
              <div className="flex items-center border-b border-white/[0.18] pb-2 focus-within:border-[#FF5C35]">
                <label htmlFor="footer-reminder-email" className="sr-only">
                  Adres e-mail
                </label>
                <input
                  id="footer-reminder-email"
                  type="email"
                  placeholder="twoj@email.pl"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  className="min-h-[40px] flex-1 bg-transparent text-sm text-white placeholder:text-[#6E6E78] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Zapisz e-mail na przypomnienie"
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center text-white transition-colors hover:text-[#FF5C35]"
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Separate UNCHECKED marketing consent checkbox (P1.11) */}
              <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-[#9A9AA3]">
                <input
                  type="checkbox"
                  checked={newsletterConsent}
                  onChange={(e) => {
                    setNewsletterConsent(e.target.checked);
                    if (newsletterStatus.type === 'error') {
                      setNewsletterStatus({ type: 'idle', text: '' });
                    }
                  }}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#FF5C35]"
                />
                <span>
                  {LEGAL_TEXTS.checkbox4Marketing} Szczegóły w{' '}
                  <a
                    href="/polityka-prywatnosci"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenLegal('polityka');
                    }}
                    className="underline hover:text-white"
                  >
                    Polityce prywatności
                  </a>
                  .
                </span>
              </label>

              {newsletterStatus.type !== 'idle' && (
                <p
                  role="status"
                  className={`text-xs ${
                    newsletterStatus.type === 'ok' ? 'text-[#4ADE80]' : 'text-[#FF8566]'
                  }`}
                >
                  {newsletterStatus.text}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Legal Links Bar (Real crawlable static HTML hrefs + interactive modal) */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-[#8E8E98] lg:flex-row lg:items-center">
          <nav aria-label="Linki prawne" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="/regulamin"
              onClick={(e) => {
                e.preventDefault();
                onOpenLegal('regulamin');
              }}
              className="min-h-[36px] inline-flex items-center transition-colors hover:text-white"
            >
              Regulamin
            </a>
            <a
              href="/polityka-prywatnosci"
              onClick={(e) => {
                e.preventDefault();
                onOpenLegal('polityka');
              }}
              className="min-h-[36px] inline-flex items-center transition-colors hover:text-white"
            >
              Polityka prywatności
            </a>
            <a
              href="/polityka-cookies"
              onClick={(e) => {
                e.preventDefault();
                onOpenLegal('cookies');
              }}
              className="min-h-[36px] inline-flex items-center transition-colors hover:text-white"
            >
              Polityka cookies
            </a>
            <a
              href="/odstapienie"
              onClick={(e) => {
                e.preventDefault();
                onOpenLegal('odstapienie');
              }}
              className="min-h-[36px] inline-flex items-center transition-colors hover:text-white"
            >
              Odstąpienie od umowy
            </a>
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="min-h-[36px] inline-flex items-center transition-colors hover:text-white"
            >
              Ustawienia cookies
            </button>
            <a
              href={`mailto:${SELLER_LEGAL_CONFIG.contactEmail}`}
              className="min-h-[36px] inline-flex items-center transition-colors hover:text-white"
            >
              Kontakt
            </a>
          </nav>

          <div className="max-w-xl space-y-1 text-[11px] leading-relaxed text-[#71717A] lg:text-right">
            <p>{LEGAL_TEXTS.footerShortDisclaimer}</p>
            <p>Dane geograficzne: GeoNames.org</p>
          </div>
        </div>
      </footer>

      {/* Editorial Article Reader Drawer */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeArticle.title}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#141417] p-5 text-white sm:rounded-[28px] sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-mono text-[11px] text-[#A1A1AA]">
                {activeArticle.author} · {activeArticle.date}
              </p>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                aria-label="Zamknij artykuł"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white hover:bg-white/[0.12]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <h3 className="font-display mt-3 text-xl font-semibold leading-snug text-white sm:text-2xl">
              {activeArticle.title}
            </h3>

            <div className="mt-4 overflow-hidden rounded-2xl bg-[#1C1C20]">
              <img
                src={activeArticle.image}
                width={640}
                height={400}
                loading="lazy"
                decoding="async"
                alt={activeArticle.imageAlt}
                referrerPolicy="no-referrer"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>

            <div className="mt-5 space-y-3.5 text-sm leading-relaxed text-[#D4D4DC]">
              {activeArticle.body.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2.5 border-t border-white/[0.08] pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const mode = activeArticle.recommendedMode;
                  setActiveArticle(null);
                  onStartFunnel(mode);
                }}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF6E4B]"
              >
                <span>
                  {activeArticle.recommendedMode === 'pair'
                    ? 'Sprawdź matrycę dla dwojga'
                    : 'Sprawdź swoją matrycę 2027'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
