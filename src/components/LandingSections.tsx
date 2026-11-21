import { useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import type { FunnelMode } from '../utils/solarisPricing';

const PORTRAIT_IMG = '/src/assets/images/editorial_warsaw_portrait_1795221168412.jpg';
const ARTICLE_FINANCE_IMG = '/src/assets/images/article_finance_2027_1795221167161.jpg';
const ARTICLE_RELATIONS_IMG = '/src/assets/images/article_relations_2027_1795221168205.jpg';
const ARTICLE_DECISIONS_IMG = '/src/assets/images/article_decisions_2027_1795221167714.jpg';

interface LandingSectionsProps {
  onStartFunnel: (mode: FunnelMode) => void;
  onOpenLegal: (doc: 'regulamin' | 'polityka') => void;
  onSaveNewsletterEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
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
      'Presja zmiany pracy lub kosztowny kredyt pod wpływem zmęczenia to najczęstszy błąd przed przełomowym kwartałem. Sprawdź, jak rozpoznać swoje okno ryzyka.',
    body: [
      'Większość złych decyzji finansowych nie wynika z braku kompetencji, tylko z fatalnego timingu. W 2027 roku układy Saturna i Jowisza wyraźnie rozdzielają okresy budowania marży od tygodni, w których rośnie presja na szybkie, nieprzemyślane ruchy.',
      'W raporcie Solaris 2027 nie dostajesz ogólników o „obfitości”. Zamiast tego widzisz konkretne przedziały dat, kiedy warto renegocjować stawki, oraz 2–3 tygodnie w roku, kiedy każdą umowę trzeba odłożyć na bok i sprawdzić dwa razy.',
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
      'Konflikty rzadko wybuchają przez brak uczuć. Zwykle chodzi o rozjazd tempa decyzji, pieniędzy i granic w jednym konkretnym miesiącu roku.',
    body: [
      'Gdy dwie osoby wchodzą w różne fazy swojego Solariusza — jedna przyspiesza zawodowo, a druga ma miesiąc przeciążenia — zwykła rozmowa o planach zamienia się w spór o brak wsparcia.',
      'Analiza dla dwojga w Solaris 2027 zestawia dokładne efemerydy obu osób i pokazuje indeks zgodności (68%–94%), miesiące największej synergii oraz przedział dat, w którym lepiej nie stawiać ultimatum.',
    ],
    image: ARTICLE_RELATIONS_IMG,
    imageAlt: 'Para rozmawiająca przy stoliku kawiarnianym w świetle dziennym',
    recommendedMode: 'pair',
  },
  {
    id: 'przeprowadzka-zmiana',
    author: 'Redakcja Solaris',
    date: 'Decyzje 2027',
    title: 'Zmiana branży albo przeprowadzka w 2027: 3 sygnały z matrycy, że to dobry moment',
    excerpt:
      'Odkładanie decyzji miesiącami wypala bardziej niż sam ruch. Sprawdź, które kwartały 2027 sprzyjają logistyce, a które blokują nowe starty.',
    body: [
      'W matrycy solarnej wyraźnie widać różnicę między kwartałem porządkowania a oknem ekspansji. Ruch wykonany w fazie zamknięcia kończy się poprawkami i dodatkowymi kosztami.',
      'Z raportem dostajesz gotowy plik .ics do Apple i Google Calendar z zaznaczonymi złotymi i ryzykownymi datami — widzisz je dokładnie tam, gdzie planujesz swój tydzień.',
    ],
    image: ARTICLE_DECISIONS_IMG,
    imageAlt: 'Osoba z telefonem z widokiem kalendarza przy oknie nad miastem o zmierzchu',
    recommendedMode: 'solo',
  },
];

const REVIEWS = [
  {
    name: 'Karolina Nowak',
    role: 'Product Manager · Warszawa',
    quote:
      'Zero ezoterycznej waty. Wskazało dokładnie trudny październik w relacji i najlepszy moment na rozmowę o podwyżce — pierwszy raz użyłam pliku .ics w kalendarzu Google.',
    featured: false,
  },
  {
    name: 'Michał & Marta',
    role: 'Wspólny biznes · Kraków',
    quote:
      'Zrobiliśmy matrycę dla dwojga przed podpisaniem umowy najmu lokalu. Opis naszego tarcia w komunikacji pod presją był celny w punkt — zaoszczędziło nam to masę nerwów.',
    featured: true,
  },
  {
    name: 'Tomasz Zieliński',
    role: 'Architekt · Gdańsk',
    quote:
      'Kupiłem na start tylko moduł Finanse za 14,99 zł, żeby sprawdzić, czy to nie kolejny generator z sieci. Po 5 minutach odblokowałem cały pakiet z PDF-em na 2027.',
    featured: false,
  },
];

export function LandingSections({
  onStartFunnel,
  onOpenLegal,
  onSaveNewsletterEmail,
}: LandingSectionsProps) {
  const [activeArticle, setActiveArticle] = useState<EditorialArticle | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'idle' | 'ok' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });
  const [articleOffset, setArticleOffset] = useState(0);

  const orderedArticles = [
    EDITORIAL_ARTICLES[articleOffset % EDITORIAL_ARTICLES.length],
    EDITORIAL_ARTICLES[(articleOffset + 1) % EDITORIAL_ARTICLES.length],
    EDITORIAL_ARTICLES[(articleOffset + 2) % EDITORIAL_ARTICLES.length],
  ];

  const handleNewsletterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await onSaveNewsletterEmail(newsletterEmail);
    setNewsletterStatus({ type: res.ok ? 'ok' : 'error', text: res.message });
    if (res.ok) setNewsletterEmail('');
  };

  return (
    <>
      {/* SECTION 2: Warm Sand Rounded Container (Exact Figma IMG_1429 bottom block) */}
      <section id="co-dostajesz" className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-[#D6D1C4] px-4 py-10 text-[#111114] sm:rounded-[34px] sm:px-8 sm:py-14 lg:px-12 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,3.6vw,2.9rem)] font-medium leading-[1.12] tracking-[-0.025em] text-[#111114]">
              Konkretny Plan Na 2027
              <br />
              Zamiast Ogólnych Horoskopów
            </h2>
            <p className="mx-auto mt-3.5 max-w-lg text-sm leading-relaxed text-[#4A4842] sm:text-[15px]">
              Łączymy dokładne obliczenia efemeryd Solariusza z krótkim profilem
              decyzyjnym. Wybierasz tylko te sfery, które naprawdę chcesz poukładać.
            </p>
          </div>

          {/* 3 High-Contrast Dark Cards matching Figma exactly */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:mt-11 lg:grid-cols-3">
            {/* Left Dark Card (Figma: Top Clients) */}
            <article className="flex flex-col justify-between rounded-[22px] bg-[#111114] p-5 text-white sm:p-6">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Profile i Zgodność
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8E8E98]">
                  Sprawdź sam siebie albo zestaw swoją datę z partnerem, przyjacielem czy wspólnikiem.
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    { initials: 'MK', name: 'Maja Kowalska', sub: 'Warszawa · Finanse Q2', tag: 'Solo' },
                    { initials: 'KO', name: 'Kamil & Ola', sub: 'Kraków · Zgodność 87%', tag: 'Para' },
                    { initials: 'PW', name: 'Piotr Wiśniewski', sub: 'Gdańsk · Zmiana branży', tag: 'Biznes' },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#242429] font-mono text-[11px] font-medium text-[#E4E4EA]">
                          {row.initials}
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

            {/* Center Dark Portrait Card (Figma: Enhance with feedback insights) */}
            <article className="flex flex-col justify-between overflow-hidden rounded-[22px] bg-[#111114] p-5 text-white sm:p-6">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Bez lania wody, prosto w daty
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8E8E98]">
                  Zamiast pustych haseł dostajesz 12-miesięczną oś energii i ryzyka oraz listę konkretnych działań.
                </p>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-2xl bg-[#1D1D22]">
                <img
                  src={PORTRAIT_IMG}
                  alt="Redakcyjny portret kobiety przy oknie w warszawskim mieszkaniu"
                  referrerPolicy="no-referrer"
                  className="h-[196px] w-full object-cover object-top"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111114]/90 via-transparent to-transparent"
                />
                <div className="absolute inset-x-3 bottom-3 text-center">
                  <p className="text-xs font-semibold text-white">Zofia, 31 · Warszawa</p>
                  <p className="font-mono text-[10px] text-[#C4C4CE]">
                    „Przesunęłam negocjacje o 3 tygodnie — trafiłam w punkt.”
                  </p>
                </div>
              </div>
            </article>

            {/* Right Dark Hatched Progress Card (Figma: Task Progress) */}
            <article className="flex flex-col justify-between rounded-[22px] bg-[#111114] p-5 text-white sm:p-6">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Modułowy raport A4 + .ics
                </h3>
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
            </article>
          </div>
        </div>
      </section>

      {/* SECTION 3: Dark Testimonials + Method Strip (Exact Figma IMG_1430 top) */}
      <section id="opinie" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-display mx-auto max-w-xl text-center text-[clamp(1.75rem,3.6vw,2.85rem)] font-medium leading-[1.12] tracking-[-0.025em]">
          <span className="text-[#8E8E95]">Czytelnicy Cenią </span>
          <span className="text-white">Konkret</span>
          <br />
          <span className="text-[#8E8E95]">Zamiast </span>
          <span className="text-white">Pustych Obietnic</span>
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {REVIEWS.map((rev) => (
            <article
              key={rev.name}
              className={`flex flex-col justify-between rounded-[22px] border p-6 text-center transition-colors duration-150 ${
                rev.featured
                  ? 'border-white/[0.16] bg-[#141418]'
                  : 'border-white/[0.06] bg-[#101013]'
              }`}
            >
              <div>
                <div className="flex items-center justify-center gap-1 text-[#F59E0B]" aria-label="Ocena 5 na 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#D4D4DC]">
                  „{rev.quote}”
                </p>
              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-semibold text-white">{rev.name}</p>
                <p className="mt-0.5 text-[11px] text-[#7D7D87]">{rev.role}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Monochrome Credibility & Method Strip (Figma logo bar equivalent) */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-white/[0.06] py-6 text-xs font-medium tracking-[0.04em] text-[#7A7A84] sm:gap-x-12 sm:text-sm">
          <span>SOLARIUSZ 2027</span>
          <span>EFEMERYDY ASTRONOMICZNE</span>
          <span>BLIK &amp; APPLE PAY</span>
          <span>KALENDARZ .ICS</span>
          <span>RAPORT A4 PDF</span>
        </div>
      </section>

      {/* SECTION 4: Asymmetric Flanking Analytics Split (Exact Figma IMG_1430 middle — Pain -> Fact Pair Hook!) */}
      <section id="zgodnosc" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          {/* Left Floating Warm-Ivory Analytics Card */}
          <article className="rounded-[22px] bg-[#F5F3EC] p-5 text-[#111114] lg:col-span-3">
            <h3 className="font-display text-sm font-semibold text-[#111114]">
              Rytm decyzji 2027
            </h3>
            <p className="mt-0.5 text-[11px] text-[#6B6B73]">
              Porównanie miesięcy wzrostu i napięć
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
                <p className="text-[10px] text-[#6B6B73]">Ryzyko</p>
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

          {/* Center Pain -> Fact Hook (User's exact editorial copy!) */}
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
              Wystarczy, że wpiszesz daty i miejsca urodzenia obu osób. Bez wysyłania linków, bez logowania —
              od razu widzisz wynik zgodności (68%–94%) oraz miesiąc, w którym warto rozmawiać szczególnie ostrożnie.
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

          {/* Right Floating Pastel Lavender Donut Card (Figma: Earnings) */}
          <article className="rounded-[22px] bg-[#E9D5FF] p-5 text-[#111114] lg:col-span-3">
            <h3 className="font-display text-center text-sm font-semibold text-[#111114]">
              Zgodność 2027
            </h3>
            <p className="mt-0.5 text-center text-[11px] text-[#4B3F5C]">
              Przykładowy wynik pary: Kasia &amp; Marek
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
                  <span className="text-[10px] text-[#4B3F5C]">Synergia</span>
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
                Prognozy Na 2027 Rok
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

      {/* FOOTER (Exact Figma IMG_1431 bottom: oversized ©SOLARIS — 2027) */}
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="font-display text-[clamp(2.5rem,9vw,6.8rem)] font-bold leading-none tracking-[-0.04em] text-[#D8D8DF]">
            ©SOLARIS — 2027
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 border-t border-white/[0.08] pt-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-white">Kontakt i pomoc</p>
            <div className="mt-3 space-y-2.5 text-sm text-[#B4B4BE]">
              <a
                href="mailto:kontakt@solaris2027.pl"
                className="flex items-center justify-between border-b border-white/[0.08] pb-2 transition-colors hover:text-white"
              >
                <span>kontakt@solaris2027.pl</span>
                <ArrowUpRight className="h-4 w-4 text-[#7D7D87]" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => onStartFunnel('solo')}
                className="flex w-full items-center justify-between border-b border-white/[0.08] pb-2 text-left transition-colors hover:text-white"
              >
                <span>Oblicz darmowy skrót matrycy 2027</span>
                <ArrowUpRight className="h-4 w-4 text-[#7D7D87]" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-white">
              Nie chcesz teraz robić testu? Zostaw e-mail po przypomnienie i rabat -20%
            </p>
            <form onSubmit={handleNewsletterSubmit} noValidate className="mt-3">
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
              {newsletterStatus.type !== 'idle' && (
                <p
                  role="status"
                  className={`mt-2 text-xs ${
                    newsletterStatus.type === 'ok' ? 'text-[#4ADE80]' : 'text-[#FF8566]'
                  }`}
                >
                  {newsletterStatus.text}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-[#7D7D87] md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onOpenLegal('regulamin')}
              className="min-h-[36px] transition-colors hover:text-white"
            >
              Regulamin
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('polityka')}
              className="min-h-[36px] transition-colors hover:text-white"
            >
              Polityka prywatności
            </button>
          </div>

          <p className="max-w-xl text-[11px] leading-relaxed text-[#71717A] md:text-right">
            Serwis Solaris 2027 ma charakter informacyjno-rozrywkowy i analityczny (efemerydy oraz analiza matrycy solarnej).
            Raporty nie stanowią porady finansowej, inwestycyjnej, prawnej ani medycznej.
          </p>
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

            <div className="mt-4 overflow-hidden rounded-2xl">
              <img
                src={activeArticle.image}
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
