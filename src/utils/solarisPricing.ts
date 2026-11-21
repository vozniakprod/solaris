export type FunnelMode = 'solo' | 'pair';
export type RelationType = 'para' | 'przyjaciele' | 'biznes';

export type ReportModuleId =
  | 'finanse'
  | 'relacje'
  | 'energia'
  | 'zmiany'
  | 'zgodnosc';

export interface ModuleDefinition {
  id: ReportModuleId;
  title: string;
  shortTitle: string;
  tagline: string;
  pairOnly?: boolean;
}

export const ALL_REPORT_MODULES: readonly ModuleDefinition[] = [
  {
    id: 'finanse',
    title: 'Finanse i Kariera 2027',
    shortTitle: 'Finanse i Kariera',
    tagline: 'Kiedy negocjować stawki, a w które tygodnie wstrzymać większe wydatki i umowy.',
  },
  {
    id: 'relacje',
    title: 'Miłość i Relacje 2027',
    shortTitle: 'Miłość i Relacje',
    tagline: 'Punkty napięcia w komunikacji, miesiące przełomu i decyzje bez złudzeń.',
  },
  {
    id: 'energia',
    title: 'Energia i Zdrowie 2027',
    shortTitle: 'Energia i Zdrowie',
    tagline: 'Kiedy grozi przeciążenie i wypalenie, a kiedy regeneracja działa najszybciej.',
  },
  {
    id: 'zmiany',
    title: 'Zmiany, Przeprowadzki i Decyzje 2027',
    shortTitle: 'Zmiany i Decyzje',
    tagline: 'Twarde okna dla zmiany pracy, mieszkania, branży lub zamknięcia starych zobowiązań.',
  },
  {
    id: 'zgodnosc',
    title: 'Zgodność z drugą osobą 2027',
    shortTitle: 'Zgodność 2027',
    tagline: 'Gdzie Wasze rytmy się wzmacniają, a w których miesiącach 2027 rośnie ryzyko spięć.',
    pairOnly: true,
  },
];

export interface PricingSummary {
  moduleCount: number;
  totalAvailable: number;
  isFullBundle: boolean;
  modulesPriceGrosze: number;
  calendarBumpGrosze: number;
  discountGrosze: number;
  finalPriceGrosze: number;
  includesFreeCalendarAndPdf: boolean;
  formattedFinalPln: string;
  formattedModulesPln: string;
}

export const ORDER_BUMP_CALENDAR_GROSZE = 999; // 9,99 zł
export const POST_PURCHASE_UPSELL_GROSZE = 1999; // 19,99 zł
export const DOWNSELL_SINGLE_MODULE_GROSZE = 999; // 9,99 zł (retention rescue)

export function formatPlnFromGrosze(grosze: number): string {
  const safe = Math.max(0, Math.round(grosze));
  const zl = Math.floor(safe / 100);
  const gr = String(safe % 100).padStart(2, '0');
  return `${zl},${gr} zł`;
}

export function getAvailableModulesForMode(mode: FunnelMode): ModuleDefinition[] {
  return ALL_REPORT_MODULES.filter((mod) => mode === 'pair' || !mod.pairOnly);
}

export function calculateModularPricing(params: {
  mode: FunnelMode;
  selectedModules: ReportModuleId[];
  includeCalendarBump: boolean;
  hasRetentionDiscount?: boolean; // 20% off full bundle OR 9,99 zł downsell for 1 module
  useDownsellOffer?: boolean;
}): PricingSummary {
  const available = getAvailableModulesForMode(params.mode);
  const validSet = new Set(available.map((m) => m.id));
  const uniqueSelected = Array.from(new Set(params.selectedModules)).filter((id) =>
    validSet.has(id),
  );

  const count = uniqueSelected.length;
  const totalAvailable = available.length;
  const isFullBundle = count >= totalAvailable && totalAvailable > 0;

  let modulesPriceGrosze = 0;
  if (count === 0) {
    modulesPriceGrosze = 0;
  } else if (isFullBundle) {
    modulesPriceGrosze = 4499; // Full Bundle (all 5 in pair or all 4 in solo) = 44,99 zł
  } else if (count === 1) {
    modulesPriceGrosze = 1499;
  } else if (count === 2) {
    modulesPriceGrosze = 2499;
  } else if (count === 3) {
    modulesPriceGrosze = 3299;
  } else if (count === 4) {
    modulesPriceGrosze = 3999;
  } else {
    modulesPriceGrosze = 4499;
  }

  const includesFreeCalendarAndPdf = isFullBundle;
  const calendarBumpGrosze =
    !isFullBundle && count > 0 && params.includeCalendarBump
      ? ORDER_BUMP_CALENDAR_GROSZE
      : 0;

  let discountGrosze = 0;
  if (params.useDownsellOffer && count === 1) {
    discountGrosze = Math.max(0, modulesPriceGrosze - DOWNSELL_SINGLE_MODULE_GROSZE);
  } else if (params.hasRetentionDiscount && isFullBundle) {
    // -20% returning non-buyer offer on Full Bundle -> 35,99 zł
    discountGrosze = 900;
  }

  const finalPriceGrosze = Math.max(
    0,
    modulesPriceGrosze + calendarBumpGrosze - discountGrosze,
  );

  return {
    moduleCount: count,
    totalAvailable,
    isFullBundle,
    modulesPriceGrosze,
    calendarBumpGrosze,
    discountGrosze,
    finalPriceGrosze,
    includesFreeCalendarAndPdf,
    formattedFinalPln: formatPlnFromGrosze(finalPriceGrosze),
    formattedModulesPln: formatPlnFromGrosze(modulesPriceGrosze),
  };
}

export function validateBirthTime(raw: string, unknown: boolean): { ok: true; normalized: string } | { ok: false; error: string } {
  if (unknown) {
    return { ok: true, normalized: '12:00' };
  }
  const trimmed = raw.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      error: 'Podaj godzinę w formacie GG:MM (np. 14:30) lub zaznacz „Nie znam dokładnej godziny”.',
    };
  }
  return {
    ok: true,
    normalized: `${match[1].padStart(2, '0')}:${match[2]}`,
  };
}

export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
