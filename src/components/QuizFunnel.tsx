import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MapPin, Users, User } from 'lucide-react';
import {
  findExactCity,
  formatPlaceLabel,
  NEAREST_MAJOR_POLISH_CITIES,
  searchCities,
  type PlaceOption,
} from '../data/polishEuCities';
import { LEGAL_TEXTS, type LegalDocId } from '../data/legalDocuments';
import { formatBirthDateInput, parsePolishBirthDate } from '../utils/solarisMatrix';
import type { PersonInput, QuizAnswers } from '../utils/ephemerisEngine';
import {
  type FunnelMode,
  type RelationType,
  validateBirthTime,
} from '../utils/solarisPricing';

export const FORM_DRAFT_STORAGE_KEY = 'solaris_form_draft_v1';

interface QuizFunnelProps {
  initialMode: FunnelMode;
  initialBirthDate?: string;
  initialPartnerBirthDate?: string;
  skipModeStep?: boolean;
  onCancel: () => void;
  onOpenLegal: (doc: LegalDocId) => void;
  onSubmitComplete: (payload: {
    mode: FunnelMode;
    relationType: RelationType | null;
    person1: PersonInput;
    person2: PersonInput | null;
    quizAnswers: QuizAnswers;
  }) => void;
}

interface QuizQuestionDef {
  key: keyof QuizAnswers;
  question: string;
  hint: string;
  options: readonly string[];
}

const QUIZ_QUESTIONS: readonly QuizQuestionDef[] = [
  {
    key: 'money',
    question: 'Jakie jest Twoje główne nastawienie do pieniędzy na 2027 rok?',
    hint: 'To pozwala dopasować okna decyzji finansowych w Twoim Solariuszu.',
    options: [
      'Chcę zwiększyć dochód i podnieść stawki',
      'Priorytet to poduszka bezpieczeństwa i spokój',
      'Planuję większą inwestycję lub własny projekt',
      'Muszę wreszcie uporządkować chaos w wydatkach',
    ],
  },
  {
    key: 'crisis',
    question: 'Jak reagujesz, gdy sytuacja nagle wymyka się spod kontroli?',
    hint: 'Wskazuje, jak przejdziesz przez miesiące podwyższonego tarcia w 2027.',
    options: [
      'Tnę straty od razu i szukam planu B',
      'Wycofuję się na 48h, żeby wszystko przeliczyć',
      'Rozmawiam wprost z ludźmi, których to dotyczy',
      'Biorę za dużo na siebie i próbuję dowieźć sam/a',
    ],
  },
  {
    key: 'priority',
    question: 'Co najbardziej ciąży Ci teraz, przed wejściem w 2027 rok?',
    hint: 'Na ten obszar położymy największy nacisk w pierwszym wniosku.',
    options: [
      'Stagnacja w pracy lub zarobkach',
      'Niedopowiedzenia w ważnej relacji',
      'Przemęczenie i brak jasnego rytmu',
      'Odkładana od miesięcy decyzja o zmianie',
    ],
  },
  {
    key: 'rhythm',
    question: 'W jakim rytmie podejmujesz najlepsze życiowe decyzje?',
    hint: 'Dopasujemy zalecenia do Twojego tempa działania.',
    options: [
      'Szybkie sprinty i twarde deadliny',
      'Spokojny plan rozpisany na kwartały',
      'Dopiero pod presją konkretnego terminu',
      'Kiedy mam obok zaufaną osobę do zderzenia myśli',
    ],
  },
  {
    key: 'trigger',
    question: 'Co najszybciej wyprowadza Cię z równowagi u innych ludzi?',
    hint: 'Ostatnie pytanie — kluczowe dla analizy relacji i granic w 2027.',
    options: [
      'Brak konkretu i zmienianie zdania w ostatniej chwili',
      'Bierna agresja zamiast rozmowy wprost',
      'Spóźnialstwo i lekceważenie mojego czasu',
      'Nadmierna kontrola i wtrącanie się w moje decyzje',
    ],
  },
];

const EMPTY_PERSON: PersonInput = {
  name: '',
  birthDate: '',
  birthTime: '',
  timeUnknown: false,
  city: '',
  cityData: null,
};

interface DraftState {
  mode: FunnelMode;
  relationType: RelationType;
  person1: PersonInput;
  person2: PersonInput;
  answers: Partial<QuizAnswers>;
}

function loadDraft(): DraftState | null {
  try {
    const raw = window.localStorage.getItem(FORM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      mode: parsed.mode === 'pair' ? 'pair' : 'solo',
      relationType:
        parsed.relationType === 'przyjaciele' || parsed.relationType === 'biznes'
          ? parsed.relationType
          : 'para',
      person1: { ...EMPTY_PERSON, ...(parsed.person1 ?? {}) },
      person2: { ...EMPTY_PERSON, ...(parsed.person2 ?? {}) },
      answers: parsed.answers ?? {},
    };
  } catch {
    return null;
  }
}

interface PersonFieldsProps {
  title: string;
  subtitle: string;
  prefix: string;
  value: PersonInput;
  onChange: (next: PersonInput) => void;
  onOpenLegal: (doc: LegalDocId) => void;
  error: string | null;
}

function PersonFields({
  title,
  subtitle,
  prefix,
  value,
  onChange,
  onOpenLegal,
  error,
}: PersonFieldsProps) {
  const [cityFocused, setCityFocused] = useState(false);
  const [showNearestFallback, setShowNearestFallback] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceOption[]>(() => searchCities(value.city, 8));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.city.trim();
    setSuggestions(searchCities(q, 8));

    if (q.length < 2) return;

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&limit=8`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { places?: PlaceOption[] };
        if (Array.isArray(json.places)) {
          setSuggestions(json.places);
        }
      } catch {
        // Keep local suggestions silently on abort or offline
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [value.city]);

  const handleSelectPlace = (place: PlaceOption) => {
    onChange({
      ...value,
      city: formatPlaceLabel(place),
      cityData: {
        name: place.name,
        admin1: place.admin1,
        country: place.country,
        lat: place.lat,
        lon: place.lon,
        tz: place.tz,
      },
    });
    setCityFocused(false);
    setShowNearestFallback(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#111114] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-zinc-600">{subtitle}</p>
      </div>

      <div className="space-y-4 pt-1">
        {/* Name or nickname */}
        <div>
          <label
            htmlFor={`${prefix}-name`}
            className="mb-1.5 block text-xs font-medium text-zinc-700"
          >
            Imię (lub pseudonim)
          </label>
          <input
            id={`${prefix}-name`}
            type="text"
            autoComplete="given-name"
            placeholder="np. Anna"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-[#111114] placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]/30"
          />
        </div>

        {/* Date (masked DD.MM.RRRR) + Optional Time */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${prefix}-date`}
              className="mb-1.5 block text-xs font-medium text-zinc-700"
            >
              Data urodzenia (DD.MM.RRRR)
            </label>
            <input
              id={`${prefix}-date`}
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="15.05.1996"
              value={value.birthDate}
              onChange={(e) =>
                onChange({ ...value, birthDate: formatBirthDateInput(e.target.value) })
              }
              className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base tabular-nums text-[#111114] placeholder:font-sans placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]/30"
            />
          </div>

          <div>
            <label
              htmlFor={`${prefix}-time`}
              className="mb-1.5 block text-xs font-medium text-zinc-700"
            >
              Godzina urodzenia (opcjonalna)
            </label>
            <input
              id={`${prefix}-time`}
              type="text"
              inputMode="numeric"
              disabled={value.timeUnknown}
              placeholder={value.timeUnknown ? 'Pominięta' : 'np. 14:30'}
              value={value.timeUnknown ? '' : value.birthTime}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d:]/g, '').slice(0, 5);
                const normalized =
                  raw.length === 4 && !raw.includes(':')
                    ? `${raw.slice(0, 2)}:${raw.slice(2)}`
                    : raw;
                onChange({ ...value, birthTime: normalized, timeUnknown: false });
              }}
              className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base tabular-nums text-[#111114] placeholder:font-sans placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]/30 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </div>
        </div>

        {/* Exact Birth Time Helper + Unknown Checkbox */}
        <div className="space-y-2">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            {LEGAL_TEXTS.birthTimeHelper}
          </p>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-zinc-700 transition-colors hover:border-zinc-300">
            <input
              type="checkbox"
              checked={value.timeUnknown}
              onChange={(e) =>
                onChange({
                  ...value,
                  timeUnknown: e.target.checked,
                  birthTime: e.target.checked ? '' : value.birthTime,
                })
              }
              className="h-4 w-4 rounded border-zinc-300 accent-[#E84A27]"
            />
            <span>{LEGAL_TEXTS.birthTimeUnknownCheckbox}</span>
          </label>
        </div>

        {/* Structured City Autocomplete + Nearest Major City Fallback */}
        <div className="relative space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`${prefix}-city`}
              className="block text-xs font-medium text-zinc-700"
            >
              Miejsce urodzenia (wybierz miasto z listy)
            </label>
            {value.cityData && (
              <span className="font-mono text-[10px] font-medium text-emerald-700">
                ✓ {value.cityData.tz}
              </span>
            )}
          </div>

          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              id={`${prefix}-city`}
              type="text"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={`${prefix}-city-listbox`}
              aria-expanded={cityFocused && !value.cityData}
              placeholder="np. Warszawa, Kraków, Gdańsk"
              value={value.city}
              onFocus={() => setCityFocused(true)}
              onBlur={() => setTimeout(() => setCityFocused(false), 180)}
              onChange={(e) =>
                onChange({
                  ...value,
                  city: e.target.value,
                  cityData: null,
                })
              }
              className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-base text-[#111114] placeholder:text-zinc-400 focus:border-[#E84A27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27]/30"
            />
          </div>

          {cityFocused && !value.cityData && (
            <ul
              id={`${prefix}-city-listbox`}
              role="listbox"
              aria-label="Podpowiedzi miejscowości"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl"
            >
              {suggestions.length > 0 ? (
                suggestions.map((city) => (
                  <li key={`${city.name}-${city.admin1}-${city.country}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectPlace(city);
                      }}
                      onClick={() => handleSelectPlace(city)}
                      className="flex min-h-[42px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#111114] transition-colors hover:bg-zinc-100"
                    >
                      <span className="truncate font-medium">
                        {city.name}
                        {city.admin1 && city.admin1.toLowerCase() !== city.name.toLowerCase() ? (
                          <span className="font-normal text-xs text-zinc-500">, {city.admin1}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">{city.country}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2.5 text-xs text-zinc-500">
                  {LEGAL_TEXTS.cityNotFoundError}
                </li>
              )}
            </ul>
          )}

          <p className="text-[11px] leading-relaxed text-zinc-500">{LEGAL_TEXTS.cityHelper}</p>

          <div>
            <button
              type="button"
              onClick={() => setShowNearestFallback((prev) => !prev)}
              className="text-xs font-medium text-[#E84A27] underline decoration-[#E84A27]/40 underline-offset-4 hover:text-[#111114]"
            >
              Nie możesz znaleźć? Wybierz najbliższe większe miasto
            </button>

            {showNearestFallback && (
              <div className="mt-2.5 rounded-xl border border-zinc-200 bg-[#FAFAFA] p-3">
                <p className="mb-2 text-[11px] font-medium text-zinc-600">
                  Najbliższe większe miasto (wybierz jednym kliknięciem):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {NEAREST_MAJOR_POLISH_CITIES.map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectPlace(city)}
                      className="min-h-[34px] rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-[#111114] transition-colors hover:border-[#E84A27] hover:text-[#E84A27]"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Required Privacy Notice below form */}
      <p className="border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
        {LEGAL_TEXTS.formPrivacyHelper}{' '}
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
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-[#C83717]">
          {error}
        </p>
      )}
    </div>
  );
}

export function QuizFunnel({
  initialMode,
  initialBirthDate,
  initialPartnerBirthDate,
  skipModeStep = false,
  onCancel,
  onOpenLegal,
  onSubmitComplete,
}: QuizFunnelProps) {
  const initialDraft = loadDraft();

  const [mode, setMode] = useState<FunnelMode>(initialMode || initialDraft?.mode || 'solo');
  const [relationType, setRelationType] = useState<RelationType>(
    initialDraft?.relationType ?? 'para',
  );
  const [step, setStep] = useState<'mode' | 'person1' | 'person2' | 'quiz'>(
    skipModeStep ? 'person1' : 'mode',
  );
  const [person1, setPerson1] = useState<PersonInput>(() => {
    const base = initialDraft?.person1 ?? EMPTY_PERSON;
    return initialBirthDate ? { ...base, birthDate: initialBirthDate } : base;
  });
  const [person2, setPerson2] = useState<PersonInput>(() => {
    const base = initialDraft?.person2 ?? EMPTY_PERSON;
    return initialPartnerBirthDate ? { ...base, birthDate: initialPartnerBirthDate } : base;
  });
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>(initialDraft?.answers ?? {});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const draft: DraftState = { mode, relationType, person1, person2, answers };
      window.localStorage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [mode, relationType, person1, person2, answers]);

  const totalStages = mode === 'pair' ? 4 : 3;
  const currentStageNum =
    step === 'mode'
      ? 1
      : step === 'person1'
        ? 2
        : step === 'person2'
          ? 3
          : totalStages;

  const progressPct =
    step === 'quiz'
      ? Math.round(
          ((totalStages - 1 + (quizIndex + 1) / QUIZ_QUESTIONS.length) / totalStages) * 100,
        )
      : Math.round((currentStageNum / totalStages) * 100);

  const normalizeAndValidatePerson = (
    person: PersonInput,
  ): { ok: true; value: PersonInput } | { ok: false; error: string } => {
    if (person.name.trim().length < 2) {
      return { ok: false, error: 'Wpisz imię lub pseudonim (minimum 2 znaki).' };
    }
    const dateRes = parsePolishBirthDate(person.birthDate);
    if (!dateRes.ok) {
      return { ok: false, error: dateRes.error };
    }

    const isUnknown = person.timeUnknown || person.birthTime.trim() === '';
    const timeRes = validateBirthTime(person.birthTime, isUnknown);
    if (!timeRes.ok) {
      return { ok: false, error: timeRes.error };
    }

    let resolvedCityData = person.cityData ?? null;
    if (!resolvedCityData) {
      const exact = findExactCity(person.city);
      if (exact) {
        resolvedCityData = {
          name: exact.name,
          admin1: exact.admin1,
          country: exact.country,
          lat: exact.lat,
          lon: exact.lon,
          tz: exact.tz,
        };
      } else {
        return { ok: false, error: LEGAL_TEXTS.cityNotFoundError };
      }
    }

    return {
      ok: true,
      value: {
        ...person,
        name: person.name.trim(),
        birthDate: dateRes.value.formatted,
        birthTime: isUnknown ? '' : timeRes.normalized,
        timeUnknown: isUnknown,
        city: formatPlaceLabel(resolvedCityData),
        cityData: resolvedCityData,
      },
    };
  };

  const handleNextFromPerson1 = () => {
    const res = normalizeAndValidatePerson(person1);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPerson1(res.value);
    setError(null);
    setStep(mode === 'pair' ? 'person2' : 'quiz');
  };

  const handleNextFromPerson2 = () => {
    const res = normalizeAndValidatePerson(person2);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPerson2(res.value);
    setError(null);
    setStep('quiz');
  };

  const handleSelectQuizOption = (key: keyof QuizAnswers, option: string) => {
    const nextAnswers = { ...answers, [key]: option };
    setAnswers(nextAnswers);

    if (quizIndex < QUIZ_QUESTIONS.length - 1) {
      setQuizIndex((idx) => idx + 1);
    } else {
      const p1Res = normalizeAndValidatePerson(person1);
      if (!p1Res.ok) {
        setStep('person1');
        setError(p1Res.error);
        return;
      }

      let finalP2: PersonInput | null = null;
      if (mode === 'pair') {
        const p2Res = normalizeAndValidatePerson(person2);
        if (!p2Res.ok) {
          setStep('person2');
          setError(p2Res.error);
          return;
        }
        finalP2 = p2Res.value;
      }

      onSubmitComplete({
        mode,
        relationType: mode === 'pair' ? relationType : null,
        person1: p1Res.value,
        person2: finalP2,
        quizAnswers: nextAnswers as QuizAnswers,
      });
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'mode') {
      onCancel();
      return;
    }
    if (step === 'person1') {
      if (skipModeStep) {
        onCancel();
      } else {
        setStep('mode');
      }
      return;
    }
    if (step === 'person2') {
      setStep('person1');
      return;
    }
    if (step === 'quiz') {
      if (quizIndex > 0) {
        setQuizIndex((idx) => idx - 1);
      } else {
        setStep(mode === 'pair' ? 'person2' : 'person1');
      }
    }
  };

  const activeQuestion = QUIZ_QUESTIONS[quizIndex];

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      {/* Clean Progress Bar Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-zinc-600 transition-colors hover:text-[#111114]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Wstecz</span>
          </button>

          <span className="font-mono font-medium tabular-nums text-zinc-500">
            {step === 'quiz'
              ? `Pytanie ${quizIndex + 1} / ${QUIZ_QUESTIONS.length}`
              : `Krok ${currentStageNum} / ${totalStages}`}
          </span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full rounded-full bg-[#E84A27] transition-all duration-200"
          />
        </div>
      </div>

      {/* Crisp White Funnel Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_rgba(17,17,20,0.05)] sm:p-8">
        {step === 'mode' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#111114] sm:text-3xl">
                Dla kogo przygotowujemy raport 2027?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Wszystkie dane wpisujesz w jednym miejscu — bez zakładania konta i bez wysyłania linków.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('solo')}
                aria-pressed={mode === 'solo'}
                className={`flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 text-left transition-colors duration-150 ${
                  mode === 'solo'
                    ? 'border-[#E84A27] bg-[#FFF5F2] text-[#111114]'
                    : 'border-zinc-200 bg-[#FAFAFA] text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111114] shadow-xs">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {mode === 'solo' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E84A27] text-white">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="font-display text-base font-semibold text-[#111114]">
                    Tylko dla mnie
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    Finanse, relacje, energia i przełomy 2027
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('pair')}
                aria-pressed={mode === 'pair'}
                className={`flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 text-left transition-colors duration-150 ${
                  mode === 'pair'
                    ? 'border-[#E84A27] bg-[#FFF5F2] text-[#111114]'
                    : 'border-zinc-200 bg-[#FAFAFA] text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#E84A27] shadow-xs">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {mode === 'pair' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E84A27] text-white">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="font-display text-base font-semibold text-[#111114]">Dla dwojga</p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    Twój raport + porównanie zgodności 2027
                  </p>
                </div>
              </button>
            </div>

            {mode === 'pair' && (
              <div className="space-y-2.5 border-t border-zinc-100 pt-4">
                <p className="text-xs font-medium text-zinc-700">Jaka relacja Was łączy?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'para', label: 'Para / Relacja' },
                      { id: 'przyjaciele', label: 'Przyjaciele' },
                      { id: 'biznes', label: 'Biznes' },
                    ] as const
                  ).map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => setRelationType(rel.id)}
                      aria-pressed={relationType === rel.id}
                      className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors duration-150 ${
                        relationType === rel.id
                          ? 'border-[#111114] bg-[#111114] text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {rel.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('person1')}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D]"
            >
              <span>Przejdź do danych urodzenia</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 'person1' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNextFromPerson1();
            }}
            noValidate
            className="space-y-6"
          >
            <PersonFields
              title="Twoje dane do Solariusza 2027"
              subtitle="Uzupełnij imię (lub pseudonim) oraz miasto urodzenia. Godzina jest opcjonalna."
              prefix="p1"
              value={person1}
              onChange={(next) => {
                setPerson1(next);
                if (error) setError(null);
              }}
              onOpenLegal={onOpenLegal}
              error={error}
            />

            <button
              type="submit"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D]"
            >
              <span>
                {mode === 'pair' ? 'Dalej: dane drugiej osoby' : 'Dalej: 5 krótkich pytań'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'person2' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNextFromPerson2();
            }}
            noValidate
            className="space-y-6"
          >
            <PersonFields
              title="Dane drugiej osoby"
              subtitle="Podaj wyłącznie minimum danych (imię lub pseudonim, datę i miejsce urodzenia; godzina jest opcjonalna). Osoba musi być pełnoletnia i poinformowana."
              prefix="p2"
              value={person2}
              onChange={(next) => {
                setPerson2(next);
                if (error) setError(null);
              }}
              onOpenLegal={onOpenLegal}
              error={error}
            />

            <button
              type="submit"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E84A27] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D43E1D]"
            >
              <span>Dalej: 5 krótkich pytań</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'quiz' && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-xs font-medium text-[#E84A27]">
                Profil decyzyjny · 1 kliknięcie
              </p>
              <h2 className="font-display mt-2 text-xl font-semibold leading-snug text-[#111114] sm:text-2xl">
                {activeQuestion.question}
              </h2>
              <p className="mt-1.5 text-xs text-zinc-500">{activeQuestion.hint}</p>
            </div>

            <div className="space-y-2.5 pt-1">
              {activeQuestion.options.map((opt) => {
                const selected = answers[activeQuestion.key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectQuizOption(activeQuestion.key, opt)}
                    className={`flex min-h-[54px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E84A27] ${
                      selected
                        ? 'border-[#E84A27] bg-[#FFF5F2] text-[#111114]'
                        : 'border-zinc-200 bg-[#FAFAFA] text-[#111114] hover:border-zinc-400 hover:bg-white'
                    }`}
                  >
                    <span>{opt}</span>
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 ${
                        selected ? 'text-[#E84A27]' : 'text-zinc-400'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
