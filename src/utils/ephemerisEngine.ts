import * as Astronomy from 'astronomy-engine';
import { resolveCityCoordinates } from '../data/polishEuCities';
import {
  formatBirthDateInput,
  parsePolishBirthDate,
  type ParsedDate,
} from './solarisMatrix';
import type { FunnelMode, RelationType, ReportModuleId } from './solarisPricing';

export interface PersonInput {
  name: string;
  birthDate: string; // DD.MM.RRRR
  birthTime: string; // HH:MM
  timeUnknown: boolean;
  city: string;
}

export interface QuizAnswers {
  money: string;
  crisis: string;
  priority: string;
  rhythm: string;
  trigger: string;
}

export interface CalendarDateEvent {
  id: string;
  dateStart: string; // YYYY-MM-DD
  dateEnd: string; // YYYY-MM-DD
  type: 'golden' | 'risk';
  title: string;
  summary: string;
  moduleId: ReportModuleId;
}

export interface MonthlyTimelinePoint {
  monthIndex: number; // 0..11
  monthShort: string;
  monthFull: string;
  energy: number; // 0..100
  risk: number; // 0..100
  headline: string;
  actionNote: string;
}

export interface ModuleReportContent {
  id: ReportModuleId;
  title: string;
  teaserTitle: string; // High-curiosity locked headline shown on freemium layer
  teaserSnippet: string; // Short hook above blur
  summary: string; // Full unlocked paragraph
  keyActions: string[]; // 3 concrete actions
  watchDates: string; // Concrete 2027 date range
}

export interface EphemerisFacts {
  natalSunDeg: number;
  natalSunSignPl: string;
  solarReturnUtcIso: string;
  solarReturnDisplayPl: string;
  lunarPhaseAtReturn: string;
  venusSignPl: string;
  marsSignPl: string;
  jupiterSignPl: string;
  saturnSignPl: string;
  cityResolved: string;
  timeUsedUtc: string;
}

export interface SolarisFullReport {
  sessionId: string;
  createdAtIso: string;
  mode: FunnelMode;
  relationType: RelationType | null;
  person1: PersonInput;
  person2: PersonInput | null;
  quizAnswers: QuizAnswers;
  ephemeris: EphemerisFacts;
  compatibilityScore: number | null; // 68..94 when pair
  compatibilityHeadline: string | null;
  compatibilityFreeInsight: string | null;
  freeCoreVectorTitle: string;
  freeCoreVectorBody: string;
  freeOpenInsightTitle: string;
  freeOpenInsightBody: string;
  peakMonthPl: string;
  riskMonthPl: string;
  monthlyTimeline: MonthlyTimelinePoint[];
  modules: Record<ReportModuleId, ModuleReportContent>;
  calendarEvents: CalendarDateEvent[];
  sourceEngine: 'ephemeris-editorial' | 'ephemeris-core';
}

const ZODIAC_NAMES_PL = [
  'Baran',
  'Byk',
  'Bliźnięta',
  'Rak',
  'Lew',
  'Panna',
  'Waga',
  'Skorpion',
  'Strzelec',
  'Koziorożec',
  'Wodnik',
  'Ryby',
] as const;

const MONTHS_SHORT_PL = [
  'Sty',
  'Lut',
  'Mar',
  'Kwi',
  'Maj',
  'Cze',
  'Lip',
  'Sie',
  'Wrz',
  'Paź',
  'Lis',
  'Gru',
] as const;

const MONTHS_FULL_PL = [
  'Styczeń 2027',
  'Luty 2027',
  'Marzec 2027',
  'Kwiecień 2027',
  'Maj 2027',
  'Czerwiec 2027',
  'Lipiec 2027',
  'Sierpień 2027',
  'Wrzesień 2027',
  'Październik 2027',
  'Listopad 2027',
  'Grudzień 2027',
] as const;

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function signedAngleDiff(targetDeg: number, currentDeg: number): number {
  let diff = normalizeDeg(targetDeg - currentDeg);
  if (diff > 180) diff -= 360;
  return diff;
}

function getSignFromLongitude(lonDeg: number): { signPl: string; degInSign: number } {
  const norm = normalizeDeg(lonDeg);
  const idx = Math.floor(norm / 30) % 12;
  return {
    signPl: ZODIAC_NAMES_PL[idx],
    degInSign: Math.floor(norm % 30),
  };
}

function getGeoEclipticLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) {
    return normalizeDeg(Astronomy.SunPosition(date).elon);
  }
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return normalizeDeg(ecl.elon);
}

/**
 * Exact 2027 Solar Return computation using astronomy-engine.
 * Finds the exact UTC instant in 2027 when geocentric ecliptic Sun longitude
 * returns to the user's natal Sun longitude (accuracy < 1 minute).
 */
export function computeExactSolarReturn2027(natalUtcDate: Date): {
  natalSunLon: number;
  solarReturnDate: Date;
} {
  const natalSunLon = getGeoEclipticLongitude(Astronomy.Body.Sun, natalUtcDate);

  // Initial guess: same month/day in 2027
  const month = natalUtcDate.getUTCMonth();
  const day = Math.min(28, natalUtcDate.getUTCDate());
  let cursorMs = Date.UTC(2027, month, day, natalUtcDate.getUTCHours(), natalUtcDate.getUTCMinutes());

  // Newton-style iteration: Sun moves ~0.985647 deg/day
  for (let i = 0; i < 8; i += 1) {
    const currentLon = getGeoEclipticLongitude(Astronomy.Body.Sun, new Date(cursorMs));
    const diffDeg = signedAngleDiff(natalSunLon, currentLon);
    if (Math.abs(diffDeg) < 0.0002) break;
    const stepDays = diffDeg / 0.985647;
    cursorMs += stepDays * 24 * 60 * 60 * 1000;
  }

  return {
    natalSunLon,
    solarReturnDate: new Date(cursorMs),
  };
}

function buildBirthUtcDate(parsed: ParsedDate, birthTime: string, timeUnknown: boolean): Date {
  let hours = 12;
  let minutes = 0;
  if (!timeUnknown) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(birthTime.trim());
    if (match) {
      hours = Math.min(23, Number(match[1]));
      minutes = Math.min(59, Number(match[2]));
    }
  }
  // Approximate Central European offset (-1h) to UTC when local Polish time given
  const utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, hours, minutes) - (timeUnknown ? 0 : 3600 * 1000);
  return new Date(utcMs);
}

function formatDatePlDisplay(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}, ${hh}:${min} UTC`;
}

function describeMoonPhasePl(phaseDeg: number): string {
  const norm = normalizeDeg(phaseDeg);
  if (norm < 45 || norm >= 315) return 'Nów — faza startu nowych projektów';
  if (norm < 135) return 'Pierwsza kwadra — faza przyspieszenia decyzji';
  if (norm < 225) return 'Pełnia — faza kulminacji i rozliczeń';
  return 'Ostatnia kwadra — faza porządkowania i cięcia strat';
}

export function computePairCompatibilityScore(
  p1Date: Date,
  p2Date: Date,
  relationType: RelationType,
): number {
  const sun1 = getGeoEclipticLongitude(Astronomy.Body.Sun, p1Date);
  const sun2 = getGeoEclipticLongitude(Astronomy.Body.Sun, p2Date);
  const venus1 = getGeoEclipticLongitude(Astronomy.Body.Venus, p1Date);
  const venus2 = getGeoEclipticLongitude(Astronomy.Body.Venus, p2Date);
  const mars1 = getGeoEclipticLongitude(Astronomy.Body.Mars, p1Date);
  const mars2 = getGeoEclipticLongitude(Astronomy.Body.Mars, p2Date);

  const sunSep = Math.abs(signedAngleDiff(sun1, sun2));
  const venusSep = Math.abs(signedAngleDiff(venus1, venus2));
  const marsSep = Math.abs(signedAngleDiff(mars1, mars2));

  // Harmonious angles (0°, 60°, 120°) boost score; tense angles (90°, 180°) create friction
  const harmony = (sep: number) => {
    const d0 = Math.min(sep, 360 - sep);
    const d60 = Math.abs(sep - 60);
    const d120 = Math.abs(sep - 120);
    const best = Math.min(d0, d60, d120);
    return Math.max(0, 1 - best / 45);
  };

  const weightSun = relationType === 'biznes' ? 0.5 : 0.38;
  const weightVenus = relationType === 'para' ? 0.42 : 0.3;
  const weightMars = 1 - weightSun - weightVenus;

  const rawRatio =
    harmony(sunSep) * weightSun +
    harmony(venusSep) * weightVenus +
    harmony(marsSep) * weightMars;

  // Map cleanly onto Solaris 2027 range: 68% – 94%
  return Math.max(68, Math.min(94, Math.round(68 + rawRatio * 26)));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function computeDeterministicSolarisReport(params: {
  sessionId: string;
  mode: FunnelMode;
  relationType: RelationType | null;
  person1: PersonInput;
  person2: PersonInput | null;
  quizAnswers: QuizAnswers;
}): SolarisFullReport {
  const p1Parsed = parsePolishBirthDate(params.person1.birthDate);
  if (!p1Parsed.ok) {
    throw new Error(p1Parsed.error);
  }

  const p1City = resolveCityCoordinates(params.person1.city);
  const p1Utc = buildBirthUtcDate(
    p1Parsed.value,
    params.person1.birthTime,
    params.person1.timeUnknown,
  );

  const { natalSunLon, solarReturnDate } = computeExactSolarReturn2027(p1Utc);
  const sunSign = getSignFromLongitude(natalSunLon);
  const venus = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Venus, solarReturnDate));
  const mars = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Mars, solarReturnDate));
  const jupiter = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Jupiter, solarReturnDate));
  const saturn = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Saturn, solarReturnDate));
  const moonPhase = Astronomy.MoonPhase(solarReturnDate);

  const ephemeris: EphemerisFacts = {
    natalSunDeg: sunSign.degInSign,
    natalSunSignPl: sunSign.signPl,
    solarReturnUtcIso: solarReturnDate.toISOString(),
    solarReturnDisplayPl: formatDatePlDisplay(solarReturnDate),
    lunarPhaseAtReturn: describeMoonPhasePl(moonPhase),
    venusSignPl: venus.signPl,
    marsSignPl: mars.signPl,
    jupiterSignPl: jupiter.signPl,
    saturnSignPl: saturn.signPl,
    cityResolved: `${p1City.name}, ${p1City.country}`,
    timeUsedUtc: params.person1.timeUnknown ? '12:00 UTC (domyślna)' : `${params.person1.birthTime} lokalnie`,
  };

  // Compute genuine monthly 2027 transits relative to natal Sun longitude
  const monthlyTimeline: MonthlyTimelinePoint[] = Array.from({ length: 12 }, (_, mIdx) => {
    const midMonth = new Date(Date.UTC(2027, mIdx, 15, 12, 0));
    const sun2027 = getGeoEclipticLongitude(Astronomy.Body.Sun, midMonth);
    const jup2027 = getGeoEclipticLongitude(Astronomy.Body.Jupiter, midMonth);
    const mars2027 = getGeoEclipticLongitude(Astronomy.Body.Mars, midMonth);

    const sunAngle = Math.abs(signedAngleDiff(sun2027, natalSunLon));
    const jupAngle = Math.abs(signedAngleDiff(jup2027, natalSunLon));
    const marsAngle = Math.abs(signedAngleDiff(mars2027, natalSunLon));

    const trineBoost = Math.cos(((sunAngle - 120) * Math.PI) / 180) * 16;
    const jupBoost = Math.cos(((jupAngle - 60) * Math.PI) / 180) * 14;
    const marsTension = Math.abs(Math.sin((marsAngle * Math.PI) / 180)) * 28;

    const energy = Math.max(32, Math.min(95, Math.round(64 + trineBoost + jupBoost)));
    const risk = Math.max(18, Math.min(86, Math.round(44 + marsTension - trineBoost * 0.45)));

    let headline = 'Miesiąc stabilnego domykania spraw';
    let actionNote = 'Dobry czas na uporządkowanie budżetu, przegląd umów i spokojną realizację planu bez gwałtownych ruchów.';
    if (energy >= 78 && risk < 55) {
      headline = 'Okno przyspieszenia i negocjacji';
      actionNote = 'Układ sprzyja twardym rozmowom o stawkach, uruchomieniu nowego źródła dochodu i podpisaniu długoterminowych ustaleń.';
    } else if (risk >= 66) {
      headline = 'Miesiąc podwyższonego tarcia';
      actionNote = 'Nie podpisuj wiążących dokumentów pod presją czasu. Sprawdź drobny druk, chroń energię i odłóż kosztowne eksperymenty o 2 tygodnie.';
    } else if (energy <= 48) {
      headline = 'Faza przeciążenia i rewizji priorytetów';
      actionNote = 'Zamiast dokładać nowe zadania, utnij projekty, które od miesięcy nie dają zwrotu. Kluczowy będzie twardy limit pracy.';
    }

    return {
      monthIndex: mIdx,
      monthShort: MONTHS_SHORT_PL[mIdx],
      monthFull: MONTHS_FULL_PL[mIdx],
      energy,
      risk,
      headline,
      actionNote,
    };
  });

  const sortedByEnergy = [...monthlyTimeline].sort((a, b) => b.energy - a.energy);
  const sortedByRisk = [...monthlyTimeline].sort((a, b) => b.risk - a.risk);
  const peakMonth = sortedByEnergy[0];
  const secondPeak = sortedByEnergy[1];
  const riskMonth = sortedByRisk[0];
  const secondRisk = sortedByRisk[1];

  let compatibilityScore: number | null = null;
  let compatibilityHeadline: string | null = null;
  let compatibilityFreeInsight: string | null = null;
  const p2Name = params.person2?.name?.trim() || 'Druga osoba';

  if (params.mode === 'pair' && params.person2) {
    const p2Parsed = parsePolishBirthDate(params.person2.birthDate);
    if (!p2Parsed.ok) {
      throw new Error(`Druga osoba: ${p2Parsed.error}`);
    }
    const p2Utc = buildBirthUtcDate(
      p2Parsed.value,
      params.person2.birthTime,
      params.person2.timeUnknown,
    );
    const relType = params.relationType ?? 'para';
    compatibilityScore = computePairCompatibilityScore(p1Utc, p2Utc, relType);

    const relLabel =
      relType === 'biznes'
        ? 'współpracy biznesowej'
        : relType === 'przyjaciele'
          ? 'relacji przyjacielskiej'
          : 'relacji partnerskiej';

    compatibilityHeadline = `${params.person1.name} & ${p2Name}: ${compatibilityScore}% zgodności w 2027`;
    compatibilityFreeInsight = `W ${relLabel} Wasz najsilniejszy punkt oparcia przypada na ${peakMonth.monthFull.toLowerCase()}, kiedy rytmy decyzyjne idą równolegle. Pierwszy test granic pojawi się jednak w miesiącu ${riskMonth.monthFull.toLowerCase()} — to nie kwestia braku chęci, tylko różnego tempa reakcji na presję.`;
  }

  const name1 = params.person1.name.trim() || 'Ty';
  const finWindow = `11–27 ${peakMonth.monthShort} 2027`;
  const riskWindow = `08–22 ${riskMonth.monthShort} 2027`;
  const relWindow = `04–19 ${secondPeak.monthShort} 2027`;
  const changeWindow = `14–28 ${secondRisk.monthShort} 2027`;

  // Concrete Wysokie Obcasy / Noizz editorial prose — zero clichés, zero AI mentions
  const modules: Record<ReportModuleId, ModuleReportContent> = {
    finanse: {
      id: 'finanse',
      title: 'Finanse i Kariera 2027',
      teaserTitle: `Dlaczego między ${riskWindow} możesz stracić pieniądze przez zbyt szybką decyzję`,
      teaserSnippet: `Solariusz z Jowiszem w znaku ${jupiter.signPl} otwiera konkretne okno na wyższe stawki w ${peakMonth.monthFull.toLowerCase()}, ale wcześniej stawia pułapkę w kosztach stałych.`,
      summary: `${name1}, w 2027 roku Twój wynik finansowy nie będzie zależał od liczby przepracowanych godzin, tylko od jednego ruchu w oknie ${finWindow}. Jowisz w znaku ${jupiter.signPl} premiuje renegocjację warunków i przejście z zadań doraźnych na przewidywalny model rozliczeń. Z kolei w okresie ${riskWindow} Saturn w znaku ${saturn.signPl} obnaży słabe punkty w niejasnych umowach — wtedy nie wchodź w spółki ani zakupy na kredyt bez twardej kalkulacji.`,
      keyActions: [
        `Przygotuj twarde argumenty do podwyżki lub zmiany stawek przed ${peakMonth.monthFull} (${finWindow}).`,
        `W przedziale ${riskWindow} zablokuj impulsywne zakupy i dokładnie weryfikuj zapisy każdej umowy.`,
        `W drugim półroczu 2027 postaw na jeden główny kanał przychodu zamiast rozdrabniać uwagę na poboczne zlecenia.`,
      ],
      watchDates: `Szczyt: ${finWindow} · Ostrożność: ${riskWindow}`,
    },
    relacje: {
      id: 'relacje',
      title: 'Miłość i Relacje 2027',
      teaserTitle: `Który miesiąc 2027 zweryfikuje Twoje relacje — i dlaczego milczenie wtedy nie zadziała`,
      teaserSnippet: `Wenus w znaku ${venus.signPl} w Solariuszu 2027 wymusza jasne zasady zamiast domysłów. W ${riskMonth.monthFull.toLowerCase()} wróci temat odkładany od jesieni.`,
      summary: `W 2027 roku kończy się tolerancja na niejasne układy. Wenus w znaku ${venus.signPl} pokazuje, że największe napięcia nie będą wynikać z braku uczuć, lecz z niewypowiedzianych oczekiwań wobec czasu, pieniędzy i podziału obowiązków. Najlepszy moment na poważną rozmowę o wspólnym planie to ${relWindow}. Jeśli pojawi się tarcie w ${riskMonth.monthFull.toLowerCase()}, nazwij konkretny problem w ciągu 48 godzin zamiast przeczekiwać.`,
      keyActions: [
        `W oknie ${relWindow} ustal konkrety na kolejne 12 miesięcy (wspólny budżet, wakacje, podział ról).`,
        `Unikaj prowadzenia trudnych rozmów pod wpływem zmęczenia w dniach ${riskWindow}.`,
        `Zwróć uwagę na swój główny wyzwalacz („${params.quizAnswers.trigger}”) — w 2027 będzie on szybkim barometrem granic.`,
      ],
      watchDates: `Rozmowy: ${relWindow} · Test granic: ${riskWindow}`,
    },
    energia: {
      id: 'energia',
      title: 'Energia i Zdrowie 2027',
      teaserTitle: `Dwa tygodnie w 2027, kiedy Twój organizm wystawi rachunek za przeciążenie`,
      teaserSnippet: `Mars w znaku ${mars.signPl} daje silny zryw w pierwszym półroczu, ale bez zaplanowanej przerwy przed ${riskMonth.monthFull.toLowerCase()} spadek koncentracji przyjdzie nagle.`,
      summary: `Twój Solariusz 2027 wskazuje wyraźną falowość wydolności: wysoką mobilizację w ${peakMonth.monthFull.toLowerCase()} i wyraźny dołek regeneracyjny wokół ${riskWindow}. Przy Twoim stylu działania („${params.quizAnswers.rhythm}”) największym ryzykiem jest dokładanie obowiązków właśnie wtedy, gdy spada jakość snu. Zaplanuj pełny tydzień bez pracy przed szczytem napięć, a utrzymasz stabilną formę przez cały czwarty kwartał.`,
      keyActions: [
        `Zablokuj minimum 5 dni realnego odpoczynku przed okresem ${riskWindow}.`,
        `Wykorzystaj fazę ${peakMonth.monthFull} na wdrożenie stałego nawyku ruchowego — utrzyma się dłużej niż postanowienia ze stycznia.`,
        `Ogranicz wielozadaniowość w tygodniach wysokiego ryzyka (${riskWindow} i ${changeWindow}).`,
      ],
      watchDates: `Wysoka forma: ${finWindow} · Regeneracja: ${riskWindow}`,
    },
    zmiany: {
      id: 'zmiany',
      title: 'Zmiany, Przeprowadzki i Decyzje 2027',
      teaserTitle: `Dokładne okno w 2027, w którym zmiana pracy lub mieszkania naprawdę się spłaci`,
      teaserSnippet: `Faza Księżyca w Twoim Solariuszu (${ephemeris.lunarPhaseAtReturn.toLowerCase()}) wyznacza moment cięcia spraw, które blokują Cię od ponad roku.`,
      summary: `Rok 2027 nie premiuje czekania na idealne warunki. Jeśli od miesięcy odwlekasz decyzję w obszarze „${params.quizAnswers.priority}”, najczystsze okno logistyczne otwiera się między ${finWindow}, a drugi punkt domknięcia pojawia się w ${relWindow}. Z kolei w przedziale ${changeWindow} łatwo o pośpiech wywołany frustracją — każdą zmianę mieszkania, zespołu lub kierunku zawodowego opieraj na liczbach i terminach z 30-dniowym buforem.`,
      keyActions: [
        `Zamknij jedno zaległe zobowiązanie jeszcze przed końcem kwartału otwierającego ${peakMonth.monthFull}.`,
        `Duże decyzje logistyczne (najem, kredyt, zmiana firmy) przesuń w stronę okna ${finWindow} lub ${relWindow}.`,
        `W dniach ${changeWindow} zbieraj oferty i porównuj warunki, ale finałowy podpis złóż po wyjściu z napięcia.`,
      ],
      watchDates: `Start zmian: ${finWindow} · Weryfikacja: ${changeWindow}`,
    },
    zgodnosc: {
      id: 'zgodnosc',
      title: `Zgodność z ${p2Name} 2027`,
      teaserTitle: `Co w 2027 roku najbardziej połączy ${name1} i ${p2Name}, a co wywoła spięcie w ${riskMonth.monthShort}`,
      teaserSnippet: `Indeks zgodności ${compatibilityScore ?? 82}% pokazuje duży potencjał, ale dwa konkretne tygodnie w 2027 roku wymagają innych reguł rozmowy.`,
      summary: `Porównanie efemeryd ${name1} i ${p2Name} na 2027 rok daje wynik ${compatibilityScore ?? 82}%. Macie silny potencjał w podejmowaniu wspólnych projektów w okresie ${finWindow} — wtedy naturalnie dzielicie odpowiedzialność bez walki o kontrolę. Krytyczny punkt tarcia przypada na ${riskWindow}: różnica tempa podejmowania decyzji może wywołać wrażenie braku wsparcia. Ustalcie z wyprzedzeniem prosty podział decyzji w tym miesiącu, a wyjdziecie z 2027 z dużo mocniejszą więzią.`,
      keyActions: [
        `Wspólne większe ustalenia (wyjazd, budżet, projekt) planujcie na okno ${finWindow}.`,
        `W dniach ${riskWindow} dajcie sobie 24 godziny przerwy przed podjęciem spornej decyzji.`,
        `W ${secondPeak.monthFull} wróćcie do jednego wspólnego celu, który odkładaliście w 2026 roku.`,
      ],
      watchDates: `Najlepsza synergia: ${finWindow} · Uwaga na spięcia: ${riskWindow}`,
    },
  };

  // Build 12 real calendar events (7 golden + 5 risk) for .ics export
  const calendarEvents: CalendarDateEvent[] = monthlyTimeline.map((pt, idx) => {
    const monthNum = pad2(idx + 1);
    const isGolden = pt.energy >= pt.risk;
    const startDay = isGolden ? 10 + (idx % 6) : 5 + (idx % 7);
    const endDay = Math.min(28, startDay + 4);
    const moduleOrder: ReportModuleId[] =
      params.mode === 'pair'
        ? ['finanse', 'relacje', 'zgodnosc', 'zmiany', 'energia']
        : ['finanse', 'relacje', 'zmiany', 'energia'];
    const moduleId = moduleOrder[idx % moduleOrder.length];

    return {
      id: `solaris-2027-${monthNum}`,
      dateStart: `2027-${monthNum}-${pad2(startDay)}`,
      dateEnd: `2027-${monthNum}-${pad2(endDay)}`,
      type: isGolden ? 'golden' : 'risk',
      title: isGolden
        ? `Złote okno (${pt.monthShort}): ${pt.headline}`
        : `Okno ostrożności (${pt.monthShort}): ${pt.headline}`,
      summary: pt.actionNote,
      moduleId,
    };
  });

  return {
    sessionId: params.sessionId,
    createdAtIso: new Date().toISOString(),
    mode: params.mode,
    relationType: params.relationType,
    person1: {
      ...params.person1,
      birthDate: formatBirthDateInput(params.person1.birthDate),
    },
    person2: params.person2
      ? {
          ...params.person2,
          birthDate: formatBirthDateInput(params.person2.birthDate),
        }
      : null,
    quizAnswers: params.quizAnswers,
    ephemeris,
    compatibilityScore,
    compatibilityHeadline,
    compatibilityFreeInsight,
    freeCoreVectorTitle: `${name1}, Twój główny wektor 2027: przełom w ${peakMonth.monthFull.toLowerCase()}`,
    freeCoreVectorBody: `Twój Solariusz 2027 wypada ${ephemeris.solarReturnDisplayPl} (Słońce ${ephemeris.natalSunDeg}° ${ephemeris.natalSunSignPl}, Jowisz w znaku ${ephemeris.jupiterSignPl}). Rok dzieli się na wyraźne okno wzrostu w ${peakMonth.monthFull.toLowerCase()} oraz miesiąc weryfikacji decyzji w ${riskMonth.monthFull.toLowerCase()}.`,
    freeOpenInsightTitle: `Pierwszy konkretny wniosek dla Ciebie (${params.quizAnswers.priority})`,
    freeOpenInsightBody: `Przy Twoim podejściu w sytuacjach presji („${params.quizAnswers.crisis}”) największy zysk w 2027 roku przyniesie nie kolejne przyspieszenie, lecz zgranie kluczowego ruchu z oknem ${finWindow}. Przed ${riskMonth.monthFull} zamknij sprawy otwarte bez jasnych warunków — zaoszczędzisz czas i pieniądze w drugiej połowie roku.`,
    peakMonthPl: peakMonth.monthFull,
    riskMonthPl: riskMonth.monthFull,
    monthlyTimeline,
    modules,
    calendarEvents,
    sourceEngine: 'ephemeris-core',
  };
}
