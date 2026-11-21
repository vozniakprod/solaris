export type ChartMetricMode = 'energia' | 'ryzyko';

export type ModuleId = 'finanse' | 'relacje' | 'energia' | 'zmiany';

export interface ParsedDate {
  day: number;
  month: number;
  year: number;
  formatted: string;
}

export type DateParseResult =
  | { ok: true; value: ParsedDate }
  | { ok: false; error: string };

export interface GoldenWindowItem {
  title: string;
  range: string;
  intensity: string;
}

export interface QuarterBarDatum {
  label: string;
  low: number;
  high: number;
  peak: boolean;
}

export interface MatrixModuleItem {
  id: ModuleId;
  title: string;
  subtitle: string;
}

export interface SolarMatrixPreview {
  isCustom: boolean;
  birthDateFormatted: string;
  partnerDateFormatted: string | null;
  signNamePl: string;
  solarDegree: number;
  energySeries: number[]; // 12 months Jan–Dec 2027 (0–100)
  riskSeries: number[]; // 12 months Jan–Dec 2027 (0–100)
  headlineIndexLabel: string;
  headlineIndexValue: string;
  goldenDaysCount: number;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  goldenWindows: [GoldenWindowItem, GoldenWindowItem];
  quarterBars: QuarterBarDatum[];
  activeQuarterLabel: string;
}

export const MATRIX_MODULES: readonly MatrixModuleItem[] = [
  {
    id: 'finanse',
    title: 'Finanse i Kariera 2027',
    subtitle: 'Okna dochodu · 2. i 10. dom',
  },
  {
    id: 'relacje',
    title: 'Miłość i Relacje 2027',
    subtitle: 'Aspekty Wenus i 7. domu',
  },
  {
    id: 'zmiany',
    title: 'Zmiany i Decyzje 2027',
    subtitle: 'Przeprowadzki i punkty zwrotne',
  },
];

interface ZodiacMeta {
  namePl: string;
  startMonth: number;
  startDay: number;
  seedOffset: number;
  windows: [GoldenWindowItem, GoldenWindowItem];
}

const ZODIAC_LIST: readonly ZodiacMeta[] = [
  {
    namePl: 'Koziorożec',
    startMonth: 12,
    startDay: 22,
    seedOffset: 0,
    windows: [
      { title: 'Okno finansowe', range: '18 Lut – 12 Kwi', intensity: '92%' },
      { title: 'Kluczowa decyzja', range: '09 Paź – 27 Paź', intensity: '88%' },
    ],
  },
  {
    namePl: 'Wodnik',
    startMonth: 1,
    startDay: 20,
    seedOffset: 1,
    windows: [
      { title: 'Projekt i skala', range: '04 Mar – 26 Kwi', intensity: '91%' },
      { title: 'Zwrot w relacjach', range: '14 Wrz – 03 Paź', intensity: '86%' },
    ],
  },
  {
    namePl: 'Ryby',
    startMonth: 2,
    startDay: 19,
    seedOffset: 2,
    windows: [
      { title: 'Wzrost dochodów', range: '11 Kwi – 29 Maj', intensity: '93%' },
      { title: 'Przełom osobisty', range: '19 Lis – 06 Gru', intensity: '87%' },
    ],
  },
  {
    namePl: 'Baran',
    startMonth: 3,
    startDay: 21,
    seedOffset: 3,
    windows: [
      { title: 'Nowy kierunek', range: '07 Maj – 24 Cze', intensity: '94%' },
      { title: 'Stabilizacja umów', range: '12 Wrz – 30 Wrz', intensity: '85%' },
    ],
  },
  {
    namePl: 'Byk',
    startMonth: 4,
    startDay: 20,
    seedOffset: 4,
    windows: [
      { title: 'Złote okno kapitału', range: '10 Cze – 28 Lip', intensity: '95%' },
      { title: 'Decyzja relacyjna', range: '05 Paź – 21 Paź', intensity: '89%' },
    ],
  },
  {
    namePl: 'Bliźnięta',
    startMonth: 5,
    startDay: 21,
    seedOffset: 5,
    windows: [
      { title: 'Kontrakty i ruch', range: '15 Kwi – 08 Cze', intensity: '90%' },
      { title: 'Zmiana miejsca', range: '11 Paź – 29 Paź', intensity: '88%' },
    ],
  },
  {
    namePl: 'Rak',
    startMonth: 6,
    startDay: 21,
    seedOffset: 6,
    windows: [
      { title: 'Awans i widoczność', range: '21 Mar – 14 Maj', intensity: '93%' },
      { title: 'Równowaga i dom', range: '02 Wrz – 22 Wrz', intensity: '87%' },
    ],
  },
  {
    namePl: 'Lew',
    startMonth: 7,
    startDay: 23,
    seedOffset: 7,
    windows: [
      { title: 'Szczyt ekspansji', range: '16 Lip – 04 Wrz', intensity: '96%' },
      { title: 'Nowe partnerstwo', range: '07 Lis – 26 Lis', intensity: '88%' },
    ],
  },
  {
    namePl: 'Panna',
    startMonth: 8,
    startDay: 23,
    seedOffset: 8,
    windows: [
      { title: 'Optymalizacja zysku', range: '24 Lut – 18 Kwi', intensity: '91%' },
      { title: 'Przełom zawodowy', range: '09 Wrz – 28 Wrz', intensity: '90%' },
    ],
  },
  {
    namePl: 'Waga',
    startMonth: 9,
    startDay: 23,
    seedOffset: 9,
    windows: [
      { title: 'Sojusze i umowy', range: '14 Maj – 03 Lip', intensity: '92%' },
      { title: 'Nowy etap relacji', range: '01 Paź – 19 Paź', intensity: '89%' },
    ],
  },
  {
    namePl: 'Skorpion',
    startMonth: 10,
    startDay: 23,
    seedOffset: 10,
    windows: [
      { title: 'Strategia finansowa', range: '14 Maj – 29 Cze', intensity: '94%' },
      { title: 'Punkt zwrotny roku', range: '18 Paź – 09 Lis', intensity: '91%' },
    ],
  },
  {
    namePl: 'Strzelec',
    startMonth: 11,
    startDay: 22,
    seedOffset: 11,
    windows: [
      { title: 'Ekspansja i projekty', range: '19 Lip – 11 Wrz', intensity: '93%' },
      { title: 'Finałowa decyzja', range: '15 Lis – 04 Gru', intensity: '88%' },
    ],
  },
];

function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }
  if (year < 1925 || year > 2026) return false;
  if (month < 1 || month > 12) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function parsePolishBirthDate(raw: string): DateParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Wpisz datę urodzenia w formacie DD.MM.RRRR (np. 15.05.1996).',
    };
  }

  let day = 0;
  let month = 0;
  let year = 0;

  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);

  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return {
      ok: false,
      error: 'Podaj pełną datę w formacie DD.MM.RRRR, np. 15.05.1996.',
    };
  }

  if (year < 1925 || year > 2026) {
    return {
      ok: false,
      error: 'Rok urodzenia powinien mieścić się w przedziale 1925–2026.',
    };
  }

  if (!isValidCalendarDate(day, month, year)) {
    return {
      ok: false,
      error: 'Sprawdź datę — taki dzień nie istnieje w kalendarzu.',
    };
  }

  return {
    ok: true,
    value: {
      day,
      month,
      year,
      formatted: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`,
    },
  };
}

function resolveZodiac(day: number, month: number): ZodiacMeta {
  const md = month * 100 + day;
  if (md >= 1222 || md <= 119) return ZODIAC_LIST[0];
  if (md >= 120 && md <= 218) return ZODIAC_LIST[1];
  if (md >= 219 && md <= 320) return ZODIAC_LIST[2];
  if (md >= 321 && md <= 419) return ZODIAC_LIST[3];
  if (md >= 420 && md <= 520) return ZODIAC_LIST[4];
  if (md >= 521 && md <= 620) return ZODIAC_LIST[5];
  if (md >= 621 && md <= 722) return ZODIAC_LIST[6];
  if (md >= 723 && md <= 822) return ZODIAC_LIST[7];
  if (md >= 823 && md <= 922) return ZODIAC_LIST[8];
  if (md >= 923 && md <= 1022) return ZODIAC_LIST[9];
  if (md >= 1023 && md <= 1121) return ZODIAC_LIST[10];
  return ZODIAC_LIST[11];
}

function computeSolarDegree(day: number, month: number, meta: ZodiacMeta): number {
  const refYear = 2024;
  const current = Date.UTC(refYear, month - 1, day);
  let start = Date.UTC(refYear, meta.startMonth - 1, meta.startDay);
  if (meta.namePl === 'Koziorożec' && month === 1) {
    start = Date.UTC(refYear - 1, 11, 22);
  }
  const diff = Math.max(0, Math.round((current - start) / (1000 * 60 * 60 * 24)));
  return Math.min(29, diff);
}

export function calculateModulePricePln(selectedCount: number): string {
  switch (selectedCount) {
    case 0:
      return '0,00 zł';
    case 1:
      return '14,99 zł';
    case 2:
      return '24,99 zł';
    case 3:
      return '32,99 zł';
    case 4:
      return '39,99 zł';
    default:
      return '44,99 zł';
  }
}

export function calculateSolarMatrix2027(
  primaryDateRaw: string,
  partnerDateRaw?: string,
): { ok: true; data: SolarMatrixPreview } | { ok: false; error: string; field: 'primary' | 'partner' } {
  const primary = parsePolishBirthDate(primaryDateRaw);
  if (!primary.ok) {
    return { ok: false, error: primary.error, field: 'primary' };
  }

  let partner: ParsedDate | null = null;
  if (partnerDateRaw && partnerDateRaw.trim().length > 0) {
    const parsedPartner = parsePolishBirthDate(partnerDateRaw);
    if (!parsedPartner.ok) {
      return {
        ok: false,
        error: `Druga osoba: ${parsedPartner.error}`,
        field: 'partner',
      };
    }
    partner = parsedPartner.value;
  }

  const { day, month, year, formatted } = primary.value;
  const zodiac = resolveZodiac(day, month);
  const solarDegree = computeSolarDegree(day, month, zodiac);
  const seed = day * 13 + month * 31 + (year % 100) * 7 + zodiac.seedOffset * 19;

  const energySeries = Array.from({ length: 12 }, (_, idx) => {
    const wave =
      Math.sin(((idx + 1 + (seed % 5)) / 12) * Math.PI * 2) * 24 +
      Math.cos(((idx * 2 + (seed % 7)) / 12) * Math.PI) * 14;
    return Math.max(24, Math.min(96, Math.round(62 + wave)));
  });

  const riskSeries = Array.from({ length: 12 }, (_, idx) => {
    const inv = 104 - energySeries[idx] + ((seed + idx * 11) % 13) - 6;
    return Math.max(14, Math.min(82, Math.round(inv * 0.72)));
  });

  const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4', '2027'];
  const quarterSlices = [
    energySeries.slice(0, 3),
    energySeries.slice(3, 6),
    energySeries.slice(6, 9),
    energySeries.slice(9, 12),
    energySeries,
  ];

  let bestQuarterIdx = 0;
  let bestAvg = -1;
  const rawBars = quarterSlices.map((slice, idx) => {
    const low = Math.min(...slice);
    const high = Math.max(...slice);
    const avg = slice.reduce((acc, v) => acc + v, 0) / slice.length;
    if (idx < 4 && avg > bestAvg) {
      bestAvg = avg;
      bestQuarterIdx = idx;
    }
    return {
      label: quarterLabels[idx],
      low,
      high,
      peak: false,
    };
  });

  const quarterBars: QuarterBarDatum[] = rawBars.map((bar, idx) => ({
    ...bar,
    peak: idx === bestQuarterIdx,
  }));

  const goldenDaysCount = 11 + (seed % 5); // 11–15 golden windows
  const soloIndex = 74 + (seed % 21); // 74%–94%

  let primaryMetricLabel = 'Indeks 2027';
  let primaryMetricValue = `${soloIndex}%`;

  if (partner) {
    const pairHash =
      (day + partner.day) * 17 +
      (month + partner.month) * 29 +
      Math.abs(year - partner.year) * 11;
    const compatibility = 68 + (pairHash % 27); // strictly 68%–94%
    primaryMetricLabel = 'Zgodność';
    primaryMetricValue = `${compatibility}%`;
  }

  return {
    ok: true,
    data: {
      isCustom: true,
      birthDateFormatted: formatted,
      partnerDateFormatted: partner ? partner.formatted : null,
      signNamePl: zodiac.namePl,
      solarDegree,
      energySeries,
      riskSeries,
      headlineIndexLabel: `${zodiac.namePl} · ${String(solarDegree).padStart(2, '0')}°`,
      headlineIndexValue: primaryMetricValue,
      goldenDaysCount,
      primaryMetricLabel,
      primaryMetricValue,
      goldenWindows: zodiac.windows,
      quarterBars,
      activeQuarterLabel: quarterLabels[bestQuarterIdx],
    },
  };
}

export const DEFAULT_MATRIX_PREVIEW: SolarMatrixPreview = (() => {
  const computed = calculateSolarMatrix2027('14.11.1994');
  if (!computed.ok) {
    throw new Error('Invalid default preview seed');
  }
  return {
    ...computed.data,
    isCustom: false,
  };
})();
