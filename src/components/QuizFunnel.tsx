import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MapPin, Users, User } from 'lucide-react';
import { searchCities } from '../data/polishEuCities';
import { formatBirthDateInput, parsePolishBirthDate } from '../utils/solarisMatrix';
import type { PersonInput, QuizAnswers } from '../utils/ephemerisEngine';
import {
  type FunnelMode,
  type RelationType,
  validateBirthTime,
} from '../utils/solarisPricing';

interface QuizFunnelProps {
  initialMode: FunnelMode;
  onCancel: () => void;
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
};

interface PersonFieldsProps {
  title: string;
  subtitle: string;
  prefix: string;
  value: PersonInput;
  onChange: (next: PersonInput) => void;
  error: string | null;
}

function PersonFields({
  title,
  subtitle,
  prefix,
  value,
  onChange,
  error,
}: PersonFieldsProps) {
  const [cityFocused, setCityFocused] = useState(false);
  const citySuggestions = searchCities(value.city, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-[#9A9AA3]">{subtitle}</p>
      </div>

      <div className="space-y-3.5 pt-2">
        {/* Name */}
        <div>
          <label
            htmlFor={`${prefix}-name`}
            className="mb-1.5 block text-xs font-medium text-[#C4C4CE]"
          >
            Imię
          </label>
          <input
            id={`${prefix}-name`}
            type="text"
            autoComplete="given-name"
            placeholder="np. Karolina"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="min-h-[48px] w-full rounded-xl border border-white/[0.12] bg-[#141417] px-4 py-3 text-base text-white placeholder:text-[#6E6E78] focus:border-[#FF5C35] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35]"
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${prefix}-date`}
              className="mb-1.5 block text-xs font-medium text-[#C4C4CE]"
            >
              Data urodzenia
            </label>
            <input
              id={`${prefix}-date`}
              type="text"
              inputMode="numeric"
              placeholder="15.05.1996"
              value={value.birthDate}
              onChange={(e) =>
                onChange({ ...value, birthDate: formatBirthDateInput(e.target.value) })
              }
              className="min-h-[48px] w-full rounded-xl border border-white/[0.12] bg-[#141417] px-4 py-3 font-mono text-base tabular-nums text-white placeholder:font-sans placeholder:text-[#6E6E78] focus:border-[#FF5C35] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35]"
            />
          </div>

          <div>
            <label
              htmlFor={`${prefix}-time`}
              className="mb-1.5 block text-xs font-medium text-[#C4C4CE]"
            >
              Godzina urodzenia
            </label>
            <input
              id={`${prefix}-time`}
              type="text"
              inputMode="numeric"
              disabled={value.timeUnknown}
              placeholder={value.timeUnknown ? '12:00 UTC (domyślnie)' : '14:30'}
              value={value.timeUnknown ? '' : value.birthTime}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d:]/g, '').slice(0, 5);
                const normalized =
                  raw.length === 4 && !raw.includes(':')
                    ? `${raw.slice(0, 2)}:${raw.slice(2)}`
                    : raw;
                onChange({ ...value, birthTime: normalized });
              }}
              className="min-h-[48px] w-full rounded-xl border border-white/[0.12] bg-[#141417] px-4 py-3 font-mono text-base tabular-nums text-white placeholder:font-sans placeholder:text-[#6E6E78] focus:border-[#FF5C35] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Unknown time fallback checkbox */}
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-xs text-[#C4C4CE] transition-colors hover:border-white/[0.14]">
          <input
            type="checkbox"
            checked={value.timeUnknown}
            onChange={(e) =>
              onChange({
                ...value,
                timeUnknown: e.target.checked,
                birthTime: e.target.checked ? '12:00' : '',
              })
            }
            className="h-4 w-4 rounded border-white/30 accent-[#FF5C35]"
          />
          <span>Nie znam dokładnej godziny urodzenia (użyj 12:00 UTC)</span>
        </label>

        {/* City Autocomplete */}
        <div className="relative">
          <label
            htmlFor={`${prefix}-city`}
            className="mb-1.5 block text-xs font-medium text-[#C4C4CE]"
          >
            Miejsce urodzenia (miasto)
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D7D87]"
              aria-hidden="true"
            />
            <input
              id={`${prefix}-city`}
              type="text"
              autoComplete="off"
              placeholder="Wpisz miasto, np. Warszawa, Kraków, Berlin"
              value={value.city}
              onFocus={() => setCityFocused(true)}
              onBlur={() => setTimeout(() => setCityFocused(false), 160)}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              className="min-h-[48px] w-full rounded-xl border border-white/[0.12] bg-[#141417] py-3 pl-10 pr-4 text-base text-white placeholder:text-[#6E6E78] focus:border-[#FF5C35] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35]"
            />
          </div>

          {cityFocused &&
            citySuggestions.length > 0 &&
            !citySuggestions.some(
              (c) => c.name.toLowerCase() === value.city.trim().toLowerCase(),
            ) && (
            <ul
              role="listbox"
              aria-label="Podpowiedzi miast"
              className="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-white/[0.12] bg-[#18181D] p-1 shadow-2xl"
            >
              {citySuggestions.map((city) => (
                <li key={`${city.name}-${city.country}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange({ ...value, city: city.name });
                      setCityFocused(false);
                    }}
                    className="flex min-h-[42px] w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/[0.08]"
                  >
                    <span>{city.name}</span>
                    <span className="text-xs text-[#8E8E98]">{city.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-[#FF8566]">
          {error}
        </p>
      )}
    </div>
  );
}

export function QuizFunnel({
  initialMode,
  onCancel,
  onSubmitComplete,
}: QuizFunnelProps) {
  const [mode, setMode] = useState<FunnelMode>(initialMode);
  const [relationType, setRelationType] = useState<RelationType>('para');
  const [step, setStep] = useState<'mode' | 'person1' | 'person2' | 'quiz'>('mode');
  const [person1, setPerson1] = useState<PersonInput>(EMPTY_PERSON);
  const [person2, setPerson2] = useState<PersonInput>(EMPTY_PERSON);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [error, setError] = useState<string | null>(null);

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
          (((totalStages - 1) + (quizIndex + 1) / QUIZ_QUESTIONS.length) / totalStages) * 100,
        )
      : Math.round((currentStageNum / totalStages) * 100);

  const validatePerson = (person: PersonInput): string | null => {
    if (person.name.trim().length < 2) {
      return 'Wpisz imię (minimum 2 znaki).';
    }
    const dateRes = parsePolishBirthDate(person.birthDate);
    if (!dateRes.ok) {
      return dateRes.error;
    }
    const timeRes = validateBirthTime(person.birthTime, person.timeUnknown);
    if (!timeRes.ok) {
      return timeRes.error;
    }
    if (person.city.trim().length < 2) {
      return 'Wybierz lub wpisz miasto urodzenia.';
    }
    return null;
  };

  const handleNextFromPerson1 = () => {
    const err = validatePerson(person1);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(mode === 'pair' ? 'person2' : 'quiz');
  };

  const handleNextFromPerson2 = () => {
    const err = validatePerson(person2);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep('quiz');
  };

  const handleSelectQuizOption = (key: keyof QuizAnswers, option: string) => {
    const nextAnswers = { ...answers, [key]: option };
    setAnswers(nextAnswers);

    if (quizIndex < QUIZ_QUESTIONS.length - 1) {
      setQuizIndex((idx) => idx + 1);
    } else {
      onSubmitComplete({
        mode,
        relationType: mode === 'pair' ? relationType : null,
        person1: {
          ...person1,
          birthTime: person1.timeUnknown ? '12:00' : person1.birthTime,
        },
        person2:
          mode === 'pair'
            ? {
                ...person2,
                birthTime: person2.timeUnknown ? '12:00' : person2.birthTime,
              }
            : null,
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
      setStep('mode');
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
      {/* Progress Bar Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[#9A9AA3]">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-[#C4C4CE] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Wstecz</span>
          </button>

          <span className="font-mono tabular-nums text-[#A1A1AA]">
            {step === 'quiz'
              ? `Pytanie ${quizIndex + 1} / ${QUIZ_QUESTIONS.length}`
              : `Krok ${currentStageNum} / ${totalStages}`}
          </span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full rounded-full bg-[#FF5C35] transition-all duration-200"
          />
        </div>
      </div>

      {/* Main Funnel Card (Exact Figma dark card surface) */}
      <div className="rounded-[26px] border border-white/[0.09] bg-[#121215] p-5 sm:p-8">
        {step === 'mode' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">
                Dla kogo obliczamy matrycę 2027?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#9A9AA3]">
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
                    ? 'border-[#FF5C35] bg-[#FF5C35]/10 text-white'
                    : 'border-white/[0.09] bg-[#17171B] text-[#C4C4CE] hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {mode === 'solo' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5C35] text-white">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="font-display text-base font-semibold text-white">Tylko dla mnie</p>
                  <p className="mt-0.5 text-xs text-[#9A9AA3]">
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
                    ? 'border-[#FF5C35] bg-[#FF5C35]/10 text-white'
                    : 'border-white/[0.09] bg-[#17171B] text-[#C4C4CE] hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D8B4FE]/20 text-[#D8B4FE]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {mode === 'pair' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5C35] text-white">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="font-display text-base font-semibold text-white">Dla dwojga</p>
                  <p className="mt-0.5 text-xs text-[#9A9AA3]">
                    Twoja strategia + wynik zgodności 2027
                  </p>
                </div>
              </button>
            </div>

            {mode === 'pair' && (
              <div className="space-y-2.5 border-t border-white/[0.07] pt-4">
                <p className="text-xs font-medium text-[#C4C4CE]">
                  Jaka relacja Was łączy?
                </p>
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
                      className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors duration-150 ${
                        relationType === rel.id
                          ? 'border-[#D8B4FE] bg-[#D8B4FE] text-[#111114]'
                          : 'border-white/[0.1] bg-[#17171B] text-[#C4C4CE] hover:border-white/25'
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
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B]"
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
              subtitle="Data, godzina i miasto pozwalają wyliczyć dokładne położenie Słońca i planet w 2027."
              prefix="p1"
              value={person1}
              onChange={(next) => {
                setPerson1(next);
                if (error) setError(null);
              }}
              error={error}
            />

            <button
              type="submit"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B]"
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
              subtitle="Jeśli nie znasz dokładnej godziny urodzenia partnera lub wspólnika, zaznacz opcję poniżej."
              prefix="p2"
              value={person2}
              onChange={(next) => {
                setPerson2(next);
                if (error) setError(null);
              }}
              error={error}
            />

            <button
              type="submit"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#FF5C35] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#FF6E4B]"
            >
              <span>Dalej: 5 krótkich pytań</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'quiz' && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#D8B4FE]">
                Profil decyzyjny · 1 klik
              </p>
              <h2 className="font-display mt-2 text-xl font-medium leading-snug text-white sm:text-2xl">
                {activeQuestion.question}
              </h2>
              <p className="mt-1.5 text-xs text-[#8E8E98]">{activeQuestion.hint}</p>
            </div>

            <div className="space-y-2.5 pt-1">
              {activeQuestion.options.map((opt) => {
                const selected = answers[activeQuestion.key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectQuizOption(activeQuestion.key, opt)}
                    className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C35] ${
                      selected
                        ? 'border-[#FF5C35] bg-[#FF5C35]/15 text-white'
                        : 'border-white/[0.09] bg-[#17171B] text-[#E4E4EA] hover:border-white/25 hover:bg-[#1D1D22]'
                    }`}
                  >
                    <span>{opt}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#7D7D87]" aria-hidden="true" />
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
