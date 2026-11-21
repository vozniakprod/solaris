import * as Astronomy from 'astronomy-engine';
import {
  resolveCityCoordinates,
  type PlaceOption,
} from '../data/polishEuCities.js';
import {
  formatBirthDateInput,
  parsePolishBirthDate,
  type ParsedDate,
} from './solarisMatrix.js';
import type { FunnelMode, RelationType, ReportModuleId } from './solarisPricing.js';

export interface PersonInput {
  name: string;
  birthDate: string; // DD.MM.RRRR
  birthTime: string; // HH:MM
  timeUnknown: boolean;
  city: string;
  cityData?: Pick<PlaceOption, 'name' | 'admin1' | 'country' | 'lat' | 'lon' | 'tz'> | null;
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
  monthLocative: string;
  energy: number; // 0..100
  risk: number; // 0..100
  status: 'wzrost' | 'stabilny' | 'ryzyko';
  headline: string;
  freeHook: string;
  actionNote: string;
  transitLabel: string;
}

export interface QuarterlyBarPoint {
  label: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Rok';
  energyAvg: number;
  riskAvg: number;
  bottomPct: number;
  heightPct: number;
  isPeak: boolean;
  verdict: string;
}

export interface SphereScore {
  id: 'finanse' | 'relacje' | 'energia' | 'zmiany';
  label: string;
  scoreOutOf10: number;
  note: string;
}

export interface CompatibilitySubScores {
  decisionsAndFinance: number;
  stressCommunication: number;
  sharedRhythm2027: number;
  sharedPeakWindow: string;
  frictionTrigger: string;
}

export interface ReportAlertItem {
  id: string;
  title: string;
  dateRange: string;
  type: 'golden' | 'risk';
  scoreLabel: string;
  locked: boolean;
  moduleId: ReportModuleId;
}

export interface PlanetarySignal {
  planetPl: string;
  signPl: string;
  domainPl: string;
  practicalTakeaway: string;
}

export interface ModuleReportContent {
  id: ReportModuleId;
  title: string;
  scoreOutOf10: number;
  teaserTitle: string; // High-curiosity locked headline shown on freemium layer
  teaserSnippet: string; // Short hook above blur
  summary: string; // Lead strategic paragraph
  deepDive: string; // Second concrete tactical paragraph
  keyActions: string[]; // 3 concrete moves ("Rób to")
  avoidList: string[]; // 2 explicit traps ("Czerwone flagi")
  watchDates: string; // Concrete 2027 date range
  checkpoint: string; // Concrete mid-year verification question/benchmark
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
  timeZoneUsed: string;
  timeUsedUtc: string;
  omittedTimeDependentElements: boolean;
  unknownTimeNotePl: string | null;
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
  overallIndex2027: number; // 64..94
  compatibilityScore: number | null; // 68..94 when pair
  compatibilityHeadline: string | null;
  compatibilityFreeInsight: string | null;
  compatibilityBreakdown: CompatibilitySubScores | null;
  freeCoreVectorTitle: string;
  freeCoreVectorBody: string;
  freeOpenInsightTitle: string;
  freeOpenInsightBody: string;
  behavioralSynthesis: {
    strengthTitle: string;
    strengthText: string;
    blindSpotTitle: string;
    blindSpotText: string;
  };
  peakMonthPl: string;
  peakMonthLocativePl: string;
  riskMonthPl: string;
  riskMonthLocativePl: string;
  growthMonthsCount: number;
  stableMonthsCount: number;
  riskMonthsCount: number;
  quarterlyBars: QuarterlyBarPoint[];
  sphereScores: SphereScore[];
  planetarySignals: PlanetarySignal[];
  featuredAlerts: ReportAlertItem[];
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

const ZODIAC_LOCATIVE_PL: Record<string, string> = {
  Baran: 'Baranie',
  Byk: 'Byku',
  Bliźnięta: 'Bliźniętach',
  Rak: 'Raku',
  Lew: 'Lwie',
  Panna: 'Pannie',
  Waga: 'Wadze',
  Skorpion: 'Skorpionie',
  Strzelec: 'Strzelcu',
  Koziorożec: 'Koziorożcu',
  Wodnik: 'Wodniku',
  Ryby: 'Rybach',
};

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

const MONTHS_LOCATIVE_PL = [
  'styczniu 2027',
  'lutym 2027',
  'marcu 2027',
  'kwietniu 2027',
  'maju 2027',
  'czerwcu 2027',
  'lipcu 2027',
  'sierpniu 2027',
  'wrześniu 2027',
  'październiku 2027',
  'listopadzie 2027',
  'grudniu 2027',
] as const;

const MONTHS_INSTRUMENTAL_PL = [
  'styczniem 2027',
  'lutym 2027',
  'marcem 2027',
  'kwietniem 2027',
  'majem 2027',
  'czerwcem 2027',
  'lipcem 2027',
  'sierpniem 2027',
  'wrześniem 2027',
  'październikiem 2027',
  'listopadem 2027',
  'grudniem 2027',
] as const;

function signLoc(sign: string): string {
  return ZODIAC_LOCATIVE_PL[sign] ?? sign;
}

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

function getTimeZoneOffsetMinutes(utcInstant: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(utcInstant);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
    const localAsUtcMs = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') === 24 ? 0 : get('hour'),
      get('minute'),
      get('second'),
    );
    return Math.round((localAsUtcMs - utcInstant.getTime()) / 60000);
  } catch {
    return 60; // Safe CET fallback if invalid tz string passed
  }
}

/**
 * Converts a local calendar date & clock time in a given IANA timezone
 * (respecting historical DST/zone rules) into an exact UTC Date.
 */
export function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset1 = getTimeZoneOffsetMinutes(new Date(guessMs), timeZone);
  const pass1Ms = guessMs - offset1 * 60_000;
  const offset2 = getTimeZoneOffsetMinutes(new Date(pass1Ms), timeZone);
  return new Date(guessMs - offset2 * 60_000);
}

function buildBirthUtcDate(
  parsed: ParsedDate,
  birthTime: string,
  timeUnknown: boolean,
  timeZone: string,
): Date {
  let hours = 12;
  let minutes = 0;
  if (!timeUnknown) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(birthTime.trim());
    if (match) {
      hours = Math.min(23, Number(match[1]));
      minutes = Math.min(59, Number(match[2]));
    }
  }
  // Always convert local clock time (including 12:00 local when unknown) using historical IANA tz
  return localDateTimeToUtc(parsed.year, parsed.month, parsed.day, hours, minutes, timeZone);
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

function harmonyRatio(sep: number): number {
  const d0 = Math.min(sep, 360 - sep);
  const d60 = Math.abs(sep - 60);
  const d120 = Math.abs(sep - 120);
  const best = Math.min(d0, d60, d120);
  return Math.max(0, 1 - best / 45);
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

  const weightSun = relationType === 'biznes' ? 0.5 : 0.38;
  const weightVenus = relationType === 'para' ? 0.42 : 0.3;
  const weightMars = 1 - weightSun - weightVenus;

  const rawRatio =
    harmonyRatio(sunSep) * weightSun +
    harmonyRatio(venusSep) * weightVenus +
    harmonyRatio(marsSep) * weightMars;

  // Map cleanly onto Solaris 2027 range: 68% – 94%
  return Math.max(68, Math.min(94, Math.round(68 + rawRatio * 26)));
}

function computePairSubScores(
  p1Date: Date,
  p2Date: Date,
  sharedPeakWindow: string,
  riskMonthLocative: string,
): CompatibilitySubScores {
  const sunSep = Math.abs(
    signedAngleDiff(
      getGeoEclipticLongitude(Astronomy.Body.Sun, p1Date),
      getGeoEclipticLongitude(Astronomy.Body.Sun, p2Date),
    ),
  );
  const venusSep = Math.abs(
    signedAngleDiff(
      getGeoEclipticLongitude(Astronomy.Body.Venus, p1Date),
      getGeoEclipticLongitude(Astronomy.Body.Venus, p2Date),
    ),
  );
  const marsSep = Math.abs(
    signedAngleDiff(
      getGeoEclipticLongitude(Astronomy.Body.Mars, p1Date),
      getGeoEclipticLongitude(Astronomy.Body.Mars, p2Date),
    ),
  );

  const decisionsAndFinance = Math.max(66, Math.min(95, Math.round(67 + harmonyRatio(sunSep) * 27)));
  const stressCommunication = Math.max(62, Math.min(92, Math.round(63 + harmonyRatio(marsSep) * 28)));
  const sharedRhythm2027 = Math.max(68, Math.min(96, Math.round(69 + harmonyRatio(venusSep) * 26)));

  const frictionTrigger =
    stressCommunication < 76
      ? `W ${riskMonthLocative} zderzą się różne tempa reakcji pod presją: jedna strona chce decyzji natychmiast, druga potrzebuje liczb i spokoju.`
      : `W ${riskMonthLocative} nie zabraknie dobrej woli, ale drobne niedomówienia wokół czasu i wydatków mogą narosnąć w ciągu jednego tygodnia.`;

  return {
    decisionsAndFinance,
    stressCommunication,
    sharedRhythm2027,
    sharedPeakWindow,
    frictionTrigger,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function score10(rawPct: number): number {
  return Math.max(5, Math.min(10, Math.round(rawPct / 10)));
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

  const p1City = resolveCityCoordinates(params.person1.city, params.person1.cityData);
  const p1Utc = buildBirthUtcDate(
    p1Parsed.value,
    params.person1.birthTime,
    params.person1.timeUnknown,
    p1City.tz,
  );

  const { natalSunLon, solarReturnDate } = computeExactSolarReturn2027(p1Utc);
  const sunSign = getSignFromLongitude(natalSunLon);
  const venus = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Venus, solarReturnDate));
  const mars = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Mars, solarReturnDate));
  const jupiter = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Jupiter, solarReturnDate));
  const saturn = getSignFromLongitude(getGeoEclipticLongitude(Astronomy.Body.Saturn, solarReturnDate));
  const moonPhase = Astronomy.MoonPhase(solarReturnDate);

  const anyTimeUnknown =
    params.person1.timeUnknown || Boolean(params.mode === 'pair' && params.person2?.timeUnknown);

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
    timeZoneUsed: p1City.tz,
    timeUsedUtc: params.person1.timeUnknown
      ? `12:00 czasu lokalnego (${p1City.tz})`
      : `${params.person1.birthTime} lokalnie (${p1City.tz})`,
    omittedTimeDependentElements: anyTimeUnknown,
    unknownTimeNotePl: anyTimeUnknown
      ? 'Bez godziny urodzenia pominęliśmy elementy zależne od godziny.'
      : null,
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

    const energy = Math.max(34, Math.min(95, Math.round(64 + trineBoost + jupBoost)));
    const risk = Math.max(18, Math.min(86, Math.round(44 + marsTension - trineBoost * 0.45)));

    let status: 'wzrost' | 'stabilny' | 'ryzyko' = 'stabilny';
    let headline = 'Miesiąc stabilnego domykania spraw';
    let freeHook = 'Rytm sprzyja porządkom w budżecie i zamykaniu tematów otwartych w poprzednim kwartale.';
    let actionNote =
      'Dobry czas na uporządkowanie budżetu, przegląd umów i spokojną realizację planu bez gwałtownych ruchów. Sprawdź, które dwa zadania zabierają czas bez zwrotu finansowego i wyłącz je przed kolejnym szczytem.';
    let transitLabel = `Słońce ${Math.round(sunAngle)}° · Jowisz w ${signLoc(jupiter.signPl)}`;

    if (energy >= 76 && risk < 56) {
      status = 'wzrost';
      headline = 'Okno przyspieszenia i wyższych stawek';
      freeHook = 'Wysoki współczynnik sprawczości — rozmowy o pieniądzach i awansie mają wyraźną przewagę.';
      actionNote =
        'Układ sprzyja twardym rozmowom o stawkach, uruchomieniu nowego źródła dochodu i podpisaniu długoterminowych ustaleń. Wyślij konkretne propozycje w pierwszej połowie okna, zanim pojawi się konkurencja.';
      transitLabel = `Trygon wzrostu · Jowisz wspiera ruch`;
    } else if (risk >= 64) {
      status = 'ryzyko';
      headline = 'Miesiąc podwyższonego tarcia i weryfikacji';
      freeHook = 'Napięcie Marsa podbija ryzyko pochopnych decyzji, ostrych słów i nietrafionych wydatków.';
      actionNote =
        'Nie podpisuj wiążących dokumentów pod presją czasu. Sprawdź drobny druk, chroń energię i odłóż kosztowne eksperymenty o 14 dni. W relacjach trzymaj się faktów zamiast reagować na ton drugiej strony.';
      transitLabel = `Napięcie Marsa · Test granic i umów`;
    } else if (energy <= 50) {
      status = 'ryzyko';
      headline = 'Faza przeciążenia i cięcia zbędnych zadań';
      freeHook = 'Spadek zasobów sygnalizuje konieczność odcięcia projektów, które nie przynoszą zwrotu.';
      actionNote =
        'Zamiast dokładać nowe zadania, utnij projekty, które od miesięcy nie dają zwrotu. Kluczowy będzie twardy limit godzin pracy i minimum 4 dni bez decyzji pod presją.';
      transitLabel = `Faza rewizji · Saturn porządkuje priorytety`;
    }

    return {
      monthIndex: mIdx,
      monthShort: MONTHS_SHORT_PL[mIdx],
      monthFull: MONTHS_FULL_PL[mIdx],
      monthLocative: MONTHS_LOCATIVE_PL[mIdx],
      energy,
      risk,
      status,
      headline,
      freeHook,
      actionNote,
      transitLabel,
    };
  });

  const sortedByEnergy = [...monthlyTimeline].sort((a, b) => b.energy - a.energy);
  const sortedByRisk = [...monthlyTimeline].sort((a, b) => b.risk - a.risk);
  const peakMonth = sortedByEnergy[0];
  const secondPeak = sortedByEnergy[1];
  const riskMonth = sortedByRisk[0];
  const secondRisk = sortedByRisk[1];

  const peakLoc = MONTHS_LOCATIVE_PL[peakMonth.monthIndex];
  const peakInst = MONTHS_INSTRUMENTAL_PL[peakMonth.monthIndex];
  const secondPeakLoc = MONTHS_LOCATIVE_PL[secondPeak.monthIndex];
  const riskLoc = MONTHS_LOCATIVE_PL[riskMonth.monthIndex];
  const riskInst = MONTHS_INSTRUMENTAL_PL[riskMonth.monthIndex];

  const growthMonthsCount = monthlyTimeline.filter((m) => m.status === 'wzrost').length;
  const riskMonthsCount = monthlyTimeline.filter((m) => m.status === 'ryzyko').length;
  const stableMonthsCount = 12 - growthMonthsCount - riskMonthsCount;

  // Build Quarterly Bars (exact mirror of Hero Bento Card 3 "Presja vs Wzrost")
  const qSlices: Array<{ label: 'Q1' | 'Q2' | 'Q3' | 'Q4'; items: MonthlyTimelinePoint[] }> = [
    { label: 'Q1', items: monthlyTimeline.slice(0, 3) },
    { label: 'Q2', items: monthlyTimeline.slice(3, 6) },
    { label: 'Q3', items: monthlyTimeline.slice(6, 9) },
    { label: 'Q4', items: monthlyTimeline.slice(9, 12) },
  ];

  const rawQuarters = qSlices.map((q) => {
    const energyAvg = Math.round(q.items.reduce((acc, m) => acc + m.energy, 0) / q.items.length);
    const riskAvg = Math.round(q.items.reduce((acc, m) => acc + m.risk, 0) / q.items.length);
    const net = energyAvg - riskAvg;
    const verdict =
      net >= 22
        ? 'Kwartał ekspansji i nowych stawek'
        : net <= 6
          ? 'Kwartał weryfikacji i obrony granic'
          : 'Kwartał stabilnego budowania przewagi';
    return { label: q.label, energyAvg, riskAvg, net, verdict };
  });

  const bestQuarterLabel = [...rawQuarters].sort((a, b) => b.net - a.net)[0].label;
  const yearEnergyAvg = Math.round(
    monthlyTimeline.reduce((acc, m) => acc + m.energy, 0) / monthlyTimeline.length,
  );
  const yearRiskAvg = Math.round(
    monthlyTimeline.reduce((acc, m) => acc + m.risk, 0) / monthlyTimeline.length,
  );

  const quarterlyBars: QuarterlyBarPoint[] = [
    ...rawQuarters.map((q) => ({
      label: q.label,
      energyAvg: q.energyAvg,
      riskAvg: q.riskAvg,
      bottomPct: Math.max(12, Math.min(48, Math.round(q.riskAvg * 0.48))),
      heightPct: Math.max(28, Math.min(56, Math.round(q.energyAvg * 0.56))),
      isPeak: q.label === bestQuarterLabel,
      verdict: q.verdict,
    })),
    {
      label: 'Rok',
      energyAvg: yearEnergyAvg,
      riskAvg: yearRiskAvg,
      bottomPct: Math.max(16, Math.min(42, Math.round(yearRiskAvg * 0.45))),
      heightPct: Math.max(36, Math.min(54, Math.round(yearEnergyAvg * 0.55))),
      isPeak: false,
      verdict: 'Średni bilans całego 2027',
    },
  ];

  const overallIndex2027 = Math.max(
    64,
    Math.min(94, Math.round(yearEnergyAvg * 0.72 + (100 - yearRiskAvg) * 0.34)),
  );

  const finWindow = `11–27 ${peakMonth.monthShort} 2027`;
  const riskWindow = `08–22 ${riskMonth.monthShort} 2027`;
  const relWindow = `04–19 ${secondPeak.monthShort} 2027`;
  const changeWindow = `14–28 ${secondRisk.monthShort} 2027`;

  // 4-Sphere Scores (mirrors the hatched bars from Landing)
  const finScore10 = score10(Math.min(96, peakMonth.energy + 4));
  const relScore10 = score10(Math.min(94, secondPeak.energy + 2));
  const engScore10 = score10(Math.max(58, 100 - Math.round(riskMonth.risk * 0.32)));
  const chgScore10 = score10(Math.min(95, yearEnergyAvg + 14));

  const sphereScores: SphereScore[] = [
    {
      id: 'finanse',
      label: 'Finanse',
      scoreOutOf10: finScore10,
      note: `Szczyt negocjacyjny w ${peakLoc}`,
    },
    {
      id: 'zmiany',
      label: 'Decyzje',
      scoreOutOf10: chgScore10,
      note: `Przełomowy kwartał: ${bestQuarterLabel}`,
    },
    {
      id: 'relacje',
      label: 'Relacje',
      scoreOutOf10: relScore10,
      note: `Test granic w ${riskLoc}`,
    },
    {
      id: 'energia',
      label: 'Energia',
      scoreOutOf10: engScore10,
      note: `Punkt regeneracji przed ${riskInst}`,
    },
  ];

  let compatibilityScore: number | null = null;
  let compatibilityHeadline: string | null = null;
  let compatibilityFreeInsight: string | null = null;
  let compatibilityBreakdown: CompatibilitySubScores | null = null;
  const p2Name = params.person2?.name?.trim() || 'Druga osoba';

  if (params.mode === 'pair' && params.person2) {
    const p2Parsed = parsePolishBirthDate(params.person2.birthDate);
    if (!p2Parsed.ok) {
      throw new Error(`Druga osoba: ${p2Parsed.error}`);
    }
    const p2City = resolveCityCoordinates(params.person2.city, params.person2.cityData);
    const p2Utc = buildBirthUtcDate(
      p2Parsed.value,
      params.person2.birthTime,
      params.person2.timeUnknown,
      p2City.tz,
    );
    const relType = params.relationType ?? 'para';
    compatibilityScore = computePairCompatibilityScore(p1Utc, p2Utc, relType);
    compatibilityBreakdown = computePairSubScores(p1Utc, p2Utc, finWindow, riskLoc);

    const relLabel =
      relType === 'biznes'
        ? 'współpracy biznesowej'
        : relType === 'przyjaciele'
          ? 'relacji przyjacielskiej'
          : 'relacji partnerskiej';

    compatibilityHeadline = `${params.person1.name} & ${p2Name}: ${compatibilityScore}% zgodności w 2027`;
    compatibilityFreeInsight = `W ${relLabel} Wasz najsilniejszy punkt oparcia przypada w ${peakLoc} (${finWindow}), kiedy rytmy decyzyjne idą równolegle. Pierwszy poważny test granic pojawi się jednak w ${riskLoc} — nie z braku zaangażowania, lecz z różnego tempa reakcji na presję i niejasny podział odpowiedzialności.`;
  }

  const name1 = params.person1.name.trim() || 'Ty';

  const planetarySignals: PlanetarySignal[] = [
    {
      planetPl: 'Jowisz 2027',
      signPl: jupiter.signPl,
      domainPl: 'Pieniądze i skala',
      practicalTakeaway: `Jowisz w ${signLoc(jupiter.signPl)} premiuje odważniejsze wycenianie swojej pracy i wyjście z roli wykonawcy w ${peakLoc}.`,
    },
    {
      planetPl: 'Saturn 2027',
      signPl: saturn.signPl,
      domainPl: 'Umowy i granice',
      practicalTakeaway: `Saturn w ${signLoc(saturn.signPl)} bezlitośnie tnie niejasne układy — każdą współpracę i koszt stały w 2027 zapisuj na twardych warunkach.`,
    },
    {
      planetPl: 'Wenus 2027',
      signPl: venus.signPl,
      domainPl: 'Relacje i lojalność',
      practicalTakeaway: `Wenus w ${signLoc(venus.signPl)} podnosi poprzeczkę szczerości: niedopowiedzenia z 2026 roku wrócą do stołu w ${secondPeakLoc}.`,
    },
    {
      planetPl: 'Mars 2027',
      signPl: mars.signPl,
      domainPl: 'Energia i konflikty',
      practicalTakeaway: `Mars w ${signLoc(mars.signPl)} daje szybkie przyspieszenie w ${bestQuarterLabel}, ale w ${riskLoc} łatwo o spięcie pod wpływem zmęczenia.`,
    },
  ];

  // Featured Alerts mirroring Hero Bento Card 2 ("Twoje kluczowe alerty")
  const featuredAlerts: ReportAlertItem[] = [
    {
      id: 'alert-peak',
      title: 'Okno podwyżki i umów',
      dateRange: finWindow,
      type: 'golden',
      scoreLabel: `${peakMonth.energy}%`,
      locked: false,
      moduleId: 'finanse',
    },
    {
      id: 'alert-risk',
      title: 'Nie podpisuj w ciemno',
      dateRange: `${riskMonth.monthShort} 2027 · dokładne dni ukryte`,
      type: 'risk',
      scoreLabel: `Ryzyko ${riskMonth.risk}%`,
      locked: true,
      moduleId: params.mode === 'pair' ? 'zgodnosc' : 'finanse',
    },
    {
      id: 'alert-rel',
      title: params.mode === 'pair' ? `Rozmowa z ${p2Name}` : 'Kluczowy zwrot decyzyjny',
      dateRange: relWindow,
      type: 'golden',
      scoreLabel: `${secondPeak.energy}%`,
      locked: true,
      moduleId: params.mode === 'pair' ? 'zgodnosc' : 'zmiany',
    },
  ];

  const behavioralSynthesis = {
    strengthTitle: `Twój atut w 2027: „${params.quizAnswers.crisis}”`,
    strengthText: `Przy celu finansowym „${params.quizAnswers.money}” masz przewagę w ${peakLoc}. Zamiast czekać na idealny moment, wykorzystaj kwartał ${bestQuarterLabel} na jedną dużą zmianę zamiast pięciu drobnych poprawek.`,
    blindSpotTitle: `Punkt zapalny w ${riskLoc}: „${params.quizAnswers.trigger}”`,
    blindSpotText: `Twój deklarowany rytm („${params.quizAnswers.rhythm}”) rozjedzie się z tempem otoczenia przed ${riskInst}. Jeśli z góry nie postawisz jasnego limitu, stracisz najwięcej energii nie na samą pracę, lecz na spory o niejasne zasady.`,
  };

  // Concrete Wysokie Obcasy / Noizz editorial prose — rich multi-part dossiers, zero clichés
  const modules: Record<ReportModuleId, ModuleReportContent> = {
    finanse: {
      id: 'finanse',
      title: 'Finanse i Kariera 2027',
      scoreOutOf10: finScore10,
      teaserTitle: `Dlaczego w ${riskLoc} możesz stracić pieniądze przez jedną zbyt szybką decyzję`,
      teaserSnippet: `Solariusz z Jowiszem w ${signLoc(jupiter.signPl)} otwiera konkretne okno na wyższe stawki w ${peakLoc}, ale wcześniej stawia kosztowną pułapkę w wydatkach stałych.`,
      summary: `${name1}, w 2027 roku Twój wynik finansowy nie będzie zależał od liczby przepracowanych godzin, lecz od trafienia w okno ${finWindow}. Jowisz w ${signLoc(jupiter.signPl)} premiuje renegocjację stawek, wyjście z zaniżonych umów i przejście z zadań doraźnych na przewidywalny przychód miesięczny — zwłaszcza przy Twoim celu: „${params.quizAnswers.money}”.`,
      deepDive: `Druga strona medalu to okres ${riskWindow}, kiedy Saturn w ${signLoc(saturn.signPl)} obnaży luki w niedomkniętych ustaleniach i kosztach stałych. To najgorszy moment w roku na pożyczki pod wpływem impulsu, wejście w nieformalną spółkę albo przyjęcie zlecenia bez zaliczki i jasnego zakresu poprawek.`,
      keyActions: [
        `Przygotuj twardą listę wyników i wyjdź z rozmową o podwyżce lub nowych stawkach w oknie ${finWindow}.`,
        `Przed ${riskInst} zrób audyt subskrypcji, kosztów stałych i niejasnych umów — odzyskasz 10–15% marży bez dodatkowej pracy.`,
        `W drugiej połowie 2027 postaw na jeden główny kanał przychodu zamiast rozdrabniać uwagę na poboczne zlecenia.`,
      ],
      avoidList: [
        `Nie podpisuj długoterminowych zobowiązań finansowych (kredyt, leasing, spółka) w dniach ${riskWindow} bez 48-godzinnej pauzy.`,
        `Nie zaniżaj swojej ceny w ${peakLoc} tylko po to, żeby szybciej zamknąć temat — w tym oknie masz realną przewagę negocjacyjną.`,
      ],
      watchDates: `Szczyt: ${finWindow} · Ostrożność: ${riskWindow}`,
      checkpoint: `Benchmark na koniec ${bestQuarterLabel}: jedna kluczowa umowa lub stawka poprawiona przynajmniej o 15% względem 2026.`,
    },
    relacje: {
      id: 'relacje',
      title: 'Miłość i Relacje 2027',
      scoreOutOf10: relScore10,
      teaserTitle: `Który miesiąc 2027 zweryfikuje Twoje relacje — i dlaczego milczenie wtedy zaszkodzi`,
      teaserSnippet: `Wenus w ${signLoc(venus.signPl)} w Solariuszu 2027 kończy czas domysłów. W ${riskLoc} wróci temat odkładany od zeszłej jesieni.`,
      summary: `W 2027 roku wygasa cierpliwość do niejasnych układów i półsłówek. Wenus w ${signLoc(venus.signPl)} pokazuje wyraźnie: konflikty nie pojawią się z braku uczuć, lecz z rozjazdu oczekiwań wobec czasu, pieniędzy i podziału obowiązków. Najczystsze okno na ważną rozmowę o wspólnym kierunku otwiera się między ${relWindow}.`,
      deepDive: `W ${riskLoc} napięcie Marsa podbije wrażliwość na Twój główny wyzwalacz („${params.quizAnswers.trigger}”). Jeśli zamiast nazwać konkretny fakt wybierzesz wycofanie lub ironię, drobne nieporozumienie pociągnie się przez trzy tygodnie. Jasna zasada „mówię wprost w ciągu 48 godzin” zamieni kryzys w realny awans relacji.`,
      keyActions: [
        `W oknie ${relWindow} ustal konkrety na kolejne 12 miesięcy: wspólny budżet, wakacje, czas dla siebie i zasady podziału zadań.`,
        `Trudne rozmowy prowadź w dzień i na spokojnie — w dniach ${riskWindow} nie rozstrzygaj przyszłości relacji po 21:00.`,
        `Nazwij drugiej stronie swój wyzwalacz („${params.quizAnswers.trigger}”) zanim pojawi się presja w ${riskLoc}.`,
      ],
      avoidList: [
        `Nie zakładaj, że druga osoba domyśli się Twoich granic bez jednego jasnego zdania.`,
        `Nie wracaj w ${riskLoc} do starych sporów z 2025/2026 — rozmawiaj wyłącznie o tym, jak układacie kolejne 90 dni.`,
      ],
      watchDates: `Rozmowy: ${relWindow} · Test granic: ${riskWindow}`,
      checkpoint: `Benchmark po ${peakLoc}: wiesz dokładnie, na jakich zasadach budujecie drugą połowę 2027 — zero domysłów.`,
    },
    energia: {
      id: 'energia',
      title: 'Energia i Zdrowie 2027',
      scoreOutOf10: engScore10,
      teaserTitle: `Dwa tygodnie w ${riskLoc}, kiedy organizm wystawi rachunek za przeciążenie`,
      teaserSnippet: `Mars w ${signLoc(mars.signPl)} daje mocny zryw w ${bestQuarterLabel}, ale bez zaplanowanej przerwy przed ${riskInst} spadek formy przyjdzie nagle.`,
      summary: `Twój Solariusz 2027 pokazuje wyraźną falowość wydolności: wysoką mobilizację w ${peakLoc} (indeks ${peakMonth.energy}%) i głęboki dołek regeneracyjny w okolicach ${riskWindow}. Przy Twoim stylu działania („${params.quizAnswers.rhythm}”) największym wrogiem nie jest ciężki projekt, tylko brak zamknięcia dnia i ciągłe bycie pod telefonem.`,
      deepDive: `Zamiast kolejnego zrywu w styczniu, potraktuj 2027 jak cztery osobne bloki po 90 dni. Jeśli wpiszesz twardy urlop lub tydzień bez spotkań jeszcze przed ${riskInst}, przejdziesz przez najtrudniejszy miesiąc roku bez spadku odporności i bez wypalenia w czwartym kwartale.`,
      keyActions: [
        `Zablokuj minimum 5 dni realnego odpoczynku bez skrzynki służbowej tuż przed okresem ${riskWindow}.`,
        `Wykorzystaj wysoką energię w ${peakLoc} na wdrożenie stałego rytmu ruchu i snu — wtedy utrzyma się najdłużej.`,
        `W tygodniach wysokiego napięcia (${riskWindow} oraz ${changeWindow}) ogranicz spotkania i zostaw 1 buforowy dzień bez deadlinów.`,
      ],
      avoidList: [
        `Nie dokładaj nowych zobowiązań po pracy w ${riskLoc} — organizm zareaguje spadkiem koncentracji w ciągu 10 dni.`,
        `Nie rekompensuj braku snu kolejnymi dawkami kofeiny w drugiej połowie tygodnia.`,
      ],
      watchDates: `Wysoka forma: ${finWindow} · Regeneracja: ${riskWindow}`,
      checkpoint: `Benchmark na ${riskMonth.monthFull}: zaplanowany wypoczynek w kalendarzu z 3-tygodniowym wyprzedzeniem.`,
    },
    zmiany: {
      id: 'zmiany',
      title: 'Zmiany, Przeprowadzki i Decyzje 2027',
      scoreOutOf10: chgScore10,
      teaserTitle: `Dokładne okno w 2027, w którym zmiana pracy lub mieszkania naprawdę się spłaci`,
      teaserSnippet: `Faza Księżyca w Twoim Solariuszu (${ephemeris.lunarPhaseAtReturn.toLowerCase()}) wyznacza moment cięcia spraw, które blokują Cię od ponad roku.`,
      summary: `Rok 2027 nie nagradza czekania na stuprocentową pewność. Jeśli temat „${params.quizAnswers.priority}” ciągnie się za Tobą od miesięcy, najczystsze okno logistyczne na ruch otwiera się między ${finWindow}, a drugi punkt domknięcia pojawia się w ${relWindow}. To momenty, gdy formalności i rozmowy z decyzyjnymi osobami idą wyraźnie sprawniej.`,
      deepDive: `Z kolei przedział ${changeWindow} to strefa pozornych okazji: presja otoczenia i zmęczenie podpowiadają szybkie „byle zmienić”. W tych dniach zbieraj oferty, oglądaj mieszkania i negocjuj warunki, ale ostateczny podpis złóż dopiero po opadnięciu napięcia — z 30-dniowym buforem finansowym.`,
      keyActions: [
        `Zamknij jedno zaległe zobowiązanie lub martwy projekt jeszcze przed ${peakInst}, żeby zwolnić kalendarz.`,
        `Kluczowe decyzje logistyczne (zmiana pracy, najem, przeprowadzka, start projektu) celuj w okno ${finWindow} lub ${relWindow}.`,
        `W dniach ${changeWindow} zrób chłodną porównywarkę opcji na kartce — bez finałowych podpisów pod presją.`,
      ],
      avoidList: [
        `Nie uciekaj z obecnego miejsca wyłącznie ze złości w ${riskLoc} bez przygotowanej alternatywy.`,
        `Nie rozciągaj przygotowań na cały rok — jeśli miniesz okno ${relWindow} bez ruchu, temat utknie do 2028.`,
      ],
      watchDates: `Start zmian: ${finWindow} · Weryfikacja: ${changeWindow}`,
      checkpoint: `Benchmark na koniec 2027: przynajmniej jedna duża decyzja odkładana z 2026 roku jest już faktem, nie planem.`,
    },
    zgodnosc: {
      id: 'zgodnosc',
      title: `Zgodność z ${p2Name} 2027`,
      scoreOutOf10: score10(compatibilityScore ?? 82),
      teaserTitle: `Co w 2027 roku najbardziej połączy ${name1} i ${p2Name}, a co wywoła spięcie w ${riskLoc}`,
      teaserSnippet: `Indeks zgodności ${compatibilityScore ?? 82}% pokazuje duży potencjał, ale dwa konkretne tygodnie w 2027 roku wymagają innych reguł rozmowy.`,
      summary: `Zestawienie efemeryd ${name1} i ${p2Name} na 2027 rok daje wynik ${compatibilityScore ?? 82}% (Decyzje i finanse: ${compatibilityBreakdown?.decisionsAndFinance ?? 84}%, Komunikacja w stresie: ${compatibilityBreakdown?.stressCommunication ?? 76}%, Wspólny rytm: ${compatibilityBreakdown?.sharedRhythm2027 ?? 85}%). Najwyższa synergia wypada w oknie ${finWindow} — wtedy naturalnie dzielicie odpowiedzialność bez walki o kontrolę.`,
      deepDive: `${compatibilityBreakdown?.frictionTrigger ?? `W ${riskLoc} pojawi się różnica tempa decyzji.`} Klucz do przejścia przez ${riskWindow} bez pęknięcia to ustalenie prostego protokołu wcześniej: kto zbiera dane, kto podejmuje decyzję operacyjną i kiedy robicie 24-godzinną pauzę w spornej sprawie.`,
      keyActions: [
        `Wspólne większe ruchy (budżet, najem, wyjazd, wspólny projekt) zaplanujcie na okno ${finWindow}.`,
        `Na okres ${riskWindow} wprowadźcie zasadę 24 godzin przerwy przed podjęciem decyzji w napięciu.`,
        `W ${secondPeakLoc} wróćcie do jednego wspólnego celu, który w 2026 roku utknął przez brak czasu.`,
      ],
      avoidList: [
        `Nie mieszajcie spraw finansowych i emocjonalnych w jednej wieczornej rozmowie w ${riskLoc}.`,
        `Nie zostawiajcie kluczowych ustaleń „na słowo” — spiszcie podział ról i budżetu na 1 kartce.`,
      ],
      watchDates: `Najlepsza synergia: ${finWindow} · Test granic: ${riskWindow}`,
      checkpoint: `Benchmark dla Was: po przejściu przez ${riskMonth.monthFull} bez eskalacji druga połowa roku daje najwyższą stabilność.`,
    },
  };

  // Build 12 real calendar events for .ics export
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
    overallIndex2027,
    compatibilityScore,
    compatibilityHeadline,
    compatibilityFreeInsight,
    compatibilityBreakdown,
    freeCoreVectorTitle: `${name1}, Twój główny wektor 2027: przełom w ${peakLoc}`,
    freeCoreVectorBody: `Twój Solariusz 2027 wypada ${ephemeris.solarReturnDisplayPl} (Słońce ${ephemeris.natalSunDeg}° ${ephemeris.natalSunSignPl}, Jowisz w ${signLoc(ephemeris.jupiterSignPl)}). Rok dzieli się na ${growthMonthsCount} miesięcy wyraźnego wzrostu (szczyt w ${peakLoc}) oraz kluczowy test decyzji w ${riskLoc}.`,
    freeOpenInsightTitle: `Pierwszy konkretny wniosek dla Ciebie (${params.quizAnswers.priority})`,
    freeOpenInsightBody: `Przy Twoim podejściu w sytuacjach presji („${params.quizAnswers.crisis}”) największy zysk w 2027 roku przyniesie nie kolejne przyspieszenie, lecz zgranie kluczowego ruchu z oknem ${finWindow}. Przed ${riskInst} zamknij sprawy otwarte bez jasnych warunków — zaoszczędzisz czas i pieniądze w drugiej połowie roku.`,
    behavioralSynthesis,
    peakMonthPl: peakMonth.monthFull,
    peakMonthLocativePl: peakLoc,
    riskMonthPl: riskMonth.monthFull,
    riskMonthLocativePl: riskLoc,
    growthMonthsCount,
    stableMonthsCount,
    riskMonthsCount,
    quarterlyBars,
    sphereScores,
    planetarySignals,
    featuredAlerts,
    monthlyTimeline,
    modules,
    calendarEvents,
    sourceEngine: 'ephemeris-core',
  };
}
