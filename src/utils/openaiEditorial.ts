import type { SolarisFullReport } from './ephemerisEngine';
import type { ReportModuleId } from './solarisPricing';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface OpenAICallDiagnostics {
  ok: boolean;
  model: string;
  latencyMs: number;
  status: number | null;
  errorType: string | null;
  errorMessage: string | null;
}

export function normalizeEnvSecret(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function isOpenAIConfigured(apiKey: string | undefined): boolean {
  const cleaned = normalizeEnvSecret(apiKey);
  return cleaned.length > 10 && cleaned !== 'MY_OPENAI_API_KEY';
}

export function isReasoningOrGpt5Model(model: string): boolean {
  return /^(o[1-9]($|-)|gpt-5($|-))/i.test(model.trim());
}

export function buildOpenAIChatRequestBody(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Record<string, unknown> {
  const model = params.model.trim() || DEFAULT_OPENAI_MODEL;
  const reasoningModel = isReasoningOrGpt5Model(model);

  const body: Record<string, unknown> = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
  };

  if (reasoningModel) {
    // Reasoning / GPT-5 models reject custom temperature and count reasoning tokens inside max_completion_tokens
    body.max_completion_tokens = Math.max(params.maxTokens * 2, 2200);
    body.reasoning_effort = 'low';
  } else {
    body.temperature = 0.65;
    body.max_completion_tokens = params.maxTokens;
  }

  return body;
}

export function parseJsonObjectFromLlmContent(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip optional markdown code fences ```json ... ```
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const direct = JSON.parse(unfenced);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // Fallback: extract outermost JSON object substring
  }

  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const sliced = JSON.parse(unfenced.slice(start, end + 1));
      if (sliced && typeof sliced === 'object' && !Array.isArray(sliced)) {
        return sliced as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export const SOLARIS_EDITORIAL_SYSTEM_PROMPT = [
  'Jesteś redaktorem nowoczesnego polskiego magazynu (styl Wysokie Obcasy / Noizz). Piszesz po polsku: konkretnie, wspierająco, bez lania wody i bez ezoterycznej patetyki (ZAKAZ słów: "magia", "wszechświat", "odkryj siebie", "przeznaczenie").',
  'OBOWIĄZKOWE ZASADY BEZPIECZEŃSTWA:',
  '- Nigdy nie udzielaj porad medycznych, prawnych, finansowych ani inwestycyjnych (nie pisz "kup", "sprzedaj", "rzuć partnera", "zmień pracę", żadnych diagnoz).',
  '- Nie strasz i nie podawaj nieuchronnych zdarzeń. Używaj sformułowań ostrożnych i inspiracyjnych ("możliwy okres", "warto zwrócić uwagę", "sprzyjający moment na rozmowę").',
  '- Opieraj się wyłącznie na datach i danych przekazanych w prompcie; nie wymyślaj własnych dat.',
  '- Jeśli godzina urodzenia nie została podana, NIE wspominaj o ascendencie ani domach astrologicznych.',
  '- Zwracaj wyłącznie poprawny obiekt JSON zgodny z wymaganymi kluczami.',
].join('\n');

export function buildOpenAITeaserPrompt(report: SolarisFullReport): string {
  return [
    'Przygotuj spersonalizowane teksty do bezpłatnego podglądu raportu Solaris 2027 w formacie JSON.',
    `DANE OBLICZENIOWE: Imię: ${report.person1.name}; Słońce natalne: ${report.ephemeris.natalSunDeg}° ${report.ephemeris.natalSunSignPl}; Solariusz 2027: ${report.ephemeris.solarReturnDisplayPl}; Strefa: ${report.ephemeris.timeZoneUsed}; Jowisz: ${report.ephemeris.jupiterSignPl}; Saturn: ${report.ephemeris.saturnSignPl}; Wenus: ${report.ephemeris.venusSignPl}; Miesiąc wzrostu: ${report.peakMonthPl}; Miesiąc ostrożności: ${report.riskMonthPl}.`,
    report.ephemeris.omittedTimeDependentElements
      ? 'UWAGA: Godzina urodzenia nie została podana — pomiń ascendent i domy astrologiczne.'
      : 'Godzina urodzenia została podana.',
    report.mode === 'pair' && report.person2
      ? `TRYB DLA DWOJGA (${report.relationType}): Druga osoba: ${report.person2.name}; Orientacyjny indeks zgodności: ${report.compatibilityScore}%.`
      : 'TRYB SOLO.',
    `ODPOWIEDZI Z QUIZU: Pieniądze: ${report.quizAnswers.money} | Kryzys: ${report.quizAnswers.crisis} | Priorytet: ${report.quizAnswers.priority} | Rytm: ${report.quizAnswers.rhythm} | Wyzwalacz: ${report.quizAnswers.trigger}.`,
    'Zwróć JSON z dokładnie tymi kluczami (każda wartość po polsku, zwięzła i konkretna):',
    '{',
    '  "freeCoreVectorTitle": "krótki nagłówek główny (max 10 słów, z imieniem i miesiącem wzrostu)",',
    '  "freeCoreVectorBody": "2-3 zdania podsumowania roku 2027 z odniesieniem do priorytetu z quizu",',
    '  "freeOpenInsightTitle": "nagłówek pierwszego konkretnego wniosku (max 12 słów)",',
    '  "freeOpenInsightBody": "2-3 zdania konkretnej obserwacji i pytania do refleksji",',
    '  "compatibilityFreeInsight": "2 zdania o dynamice pary (lub pusty string w trybie solo)",',
    '  "finanseTeaserTitle": "nagłówek modułu Finanse i Kariera (max 11 słów)",',
    '  "relacjeTeaserTitle": "nagłówek modułu Relacje (max 11 słów)",',
    '  "energiaTeaserTitle": "nagłówek modułu Energia i Rytm (max 11 słów)",',
    '  "zmianyTeaserTitle": "nagłówek modułu Zmiany i Decyzje (max 11 słów)",',
    '  "zgodnoscTeaserTitle": "nagłówek modułu Zgodność (max 11 słów, lub pusty string w trybie solo)"',
    '}',
  ].join('\n');
}

export function buildOpenAIUnlockedModulesPrompt(
  report: SolarisFullReport,
  moduleIds: ReportModuleId[],
): string {
  const moduleSummaries = moduleIds.map((id) => {
    const mod = report.modules[id];
    return `- ${id}: kluczowe daty="${mod.watchDates}", temat="${mod.teaserTitle}", ocena=${mod.scoreOutOf10}/10`;
  });

  return [
    'Spersonalizuj treść odblokowanych płatnych modułów raportu Solaris 2027 w formacie JSON.',
    `OSOBA: ${report.person1.name} (${report.ephemeris.natalSunDeg}° ${report.ephemeris.natalSunSignPl}, Solariusz ${report.ephemeris.solarReturnDisplayPl}, szczyt: ${report.peakMonthPl}, ostrożność: ${report.riskMonthPl}).`,
    report.mode === 'pair' && report.person2
      ? `DRUGA OSOBA: ${report.person2.name} (${report.relationType}, indeks zgodności ${report.compatibilityScore}%).`
      : 'TRYB SOLO.',
    report.ephemeris.omittedTimeDependentElements
      ? 'UWAGA: Godzina urodzenia nie została podana — nie odnosić się do ascendentu ani domów.'
      : '',
    `QUIZ: Pieniądze="${report.quizAnswers.money}", Kryzys="${report.quizAnswers.crisis}", Priorytet="${report.quizAnswers.priority}", Rytm="${report.quizAnswers.rhythm}", Wyzwalacz="${report.quizAnswers.trigger}".`,
    'MODUŁY DO SPERSONALIZOWANIA:',
    ...moduleSummaries,
    'Zwróć obiekt JSON: { "modules": { "<moduleId>": { "summary": "3-4 konkretne zdania analizy nawiązujące do odpowiedzi z quizu i podanego przedziału dat", "deepDive": "3-4 zdania pogłębienia taktycznego (bez porad med/praw/fin i bez straszenia)", "keyActions": ["krok 1", "krok 2", "krok 3"], "avoidList": ["pułapka 1", "pułapka 2"], "checkpoint": "1 konkretne pytanie kontrolne na połowę 2027 roku" } } }',
  ]
    .filter(Boolean)
    .join('\n');
}

async function callOpenAIJsonSingleAttempt(
  apiKey: string,
  model: string,
  userPrompt: string,
  maxTokens: number,
  timeoutMs: number,
  systemPrompt = SOLARIS_EDITORIAL_SYSTEM_PROMPT,
): Promise<{ data: Record<string, unknown> | null; diag: OpenAICallDiagnostics }> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody = buildOpenAIChatRequestBody({
      model,
      systemPrompt,
      userPrompt,
      maxTokens,
    });

    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errorType: string | null = null;
      let errorMessage: string | null = errText.slice(0, 220) || `HTTP ${res.status}`;
      try {
        const parsedErr = JSON.parse(errText) as {
          error?: { type?: string; code?: string; message?: string };
        };
        errorType = parsedErr.error?.code || parsedErr.error?.type || null;
        errorMessage = parsedErr.error?.message?.slice(0, 220) || errorMessage;
      } catch {
        // raw text fallback already set
      }
      console.warn(
        `[OpenAI editorial error] model=${model} status=${res.status} latencyMs=${latencyMs} type=${errorType ?? 'unknown'} msg=${errorMessage}`,
      );
      return {
        data: null,
        diag: { ok: false, model, latencyMs, status: res.status, errorType, errorMessage },
      };
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = parseJsonObjectFromLlmContent(content);
    if (!parsed) {
      const finishReason = payload.choices?.[0]?.finish_reason ?? 'unknown';
      console.warn(
        `[OpenAI editorial parse error] model=${model} latencyMs=${latencyMs} finish_reason=${finishReason} len=${content.length}`,
      );
      return {
        data: null,
        diag: {
          ok: false,
          model,
          latencyMs,
          status: res.status,
          errorType: 'invalid_json',
          errorMessage: `Model returned non-JSON or empty output (finish_reason=${finishReason})`,
        },
      };
    }

    console.info(`[OpenAI editorial ok] model=${model} latencyMs=${latencyMs}`);
    return {
      data: parsed,
      diag: { ok: true, model, latencyMs, status: res.status, errorType: null, errorMessage: null },
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const message = isAbort
      ? `Timeout after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : String(err);
    console.warn(`[OpenAI editorial fallback] model=${model} latencyMs=${latencyMs} err=${message}`);
    return {
      data: null,
      diag: {
        ok: false,
        model,
        latencyMs,
        status: null,
        errorType: isAbort ? 'timeout' : 'network_error',
        errorMessage: message.slice(0, 220),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAIJson(
  apiKey: string,
  model: string,
  userPrompt: string,
  maxTokens: number,
  timeoutMs: number,
): Promise<Record<string, unknown> | null> {
  const first = await callOpenAIJsonSingleAttempt(apiKey, model, userPrompt, maxTokens, timeoutMs);
  if (first.data) return first.data;

  // If a custom OPENAI_MODEL failed with 400/404 (bad model name or unsupported parameter), retry once on DEFAULT_OPENAI_MODEL
  const shouldFallbackModel =
    model !== DEFAULT_OPENAI_MODEL &&
    (first.diag.status === 400 || first.diag.status === 404);
  if (shouldFallbackModel) {
    console.warn(`[OpenAI editorial] Retrying with fallback model ${DEFAULT_OPENAI_MODEL}`);
    const retry = await callOpenAIJsonSingleAttempt(
      apiKey,
      DEFAULT_OPENAI_MODEL,
      userPrompt,
      maxTokens,
      Math.min(timeoutMs, 12000),
    );
    return retry.data;
  }

  return null;
}

export async function checkOpenAIConnection(
  rawApiKey: string | undefined,
  rawModel?: string,
): Promise<OpenAICallDiagnostics & { configured: boolean; keyFormatOk: boolean }> {
  const cleanedKey = normalizeEnvSecret(rawApiKey);
  const configured = isOpenAIConfigured(rawApiKey);
  const keyFormatOk = cleanedKey.startsWith('sk-') && cleanedKey.length >= 24;
  const model = normalizeEnvSecret(rawModel) || DEFAULT_OPENAI_MODEL;

  if (!configured) {
    return {
      configured: false,
      keyFormatOk: false,
      ok: false,
      model,
      latencyMs: 0,
      status: null,
      errorType: 'missing_api_key',
      errorMessage: 'OPENAI_API_KEY is not configured in server environment variables.',
    };
  }

  const res = await callOpenAIJsonSingleAttempt(
    cleanedKey,
    model,
    'Zwróć JSON: {"pong": true}',
    40,
    10000,
    'Return valid JSON only.',
  );

  return {
    configured: true,
    keyFormatOk,
    ...res.diag,
  };
}

function asNonEmptyString(val: unknown): string | null {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
}

function asStringArray(val: unknown, minLen: number, maxLen: number): string[] | null {
  if (!Array.isArray(val)) return null;
  const cleaned = val
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, maxLen);
  return cleaned.length >= minLen ? cleaned : null;
}

export async function enrichTeaserWithOpenAI(
  report: SolarisFullReport,
  rawApiKey: string | undefined,
  rawModel?: string,
): Promise<SolarisFullReport> {
  if (!isOpenAIConfigured(rawApiKey)) {
    return report;
  }

  const apiKey = normalizeEnvSecret(rawApiKey);
  const model = normalizeEnvSecret(rawModel) || DEFAULT_OPENAI_MODEL;
  const parsed = await callOpenAIJson(apiKey, model, buildOpenAITeaserPrompt(report), 950, 15000);
  if (!parsed) return report;

  const nextModules = { ...report.modules };
  const finanseTitle = asNonEmptyString(parsed.finanseTeaserTitle);
  const relacjeTitle = asNonEmptyString(parsed.relacjeTeaserTitle);
  const energiaTitle = asNonEmptyString(parsed.energiaTeaserTitle);
  const zmianyTitle = asNonEmptyString(parsed.zmianyTeaserTitle);
  const zgodnoscTitle = asNonEmptyString(parsed.zgodnoscTeaserTitle);

  if (finanseTitle) nextModules.finanse = { ...nextModules.finanse, teaserTitle: finanseTitle };
  if (relacjeTitle) nextModules.relacje = { ...nextModules.relacje, teaserTitle: relacjeTitle };
  if (energiaTitle) nextModules.energia = { ...nextModules.energia, teaserTitle: energiaTitle };
  if (zmianyTitle) nextModules.zmiany = { ...nextModules.zmiany, teaserTitle: zmianyTitle };
  if (zgodnoscTitle && report.mode === 'pair') {
    nextModules.zgodnosc = { ...nextModules.zgodnosc, teaserTitle: zgodnoscTitle };
  }

  return {
    ...report,
    freeCoreVectorTitle: asNonEmptyString(parsed.freeCoreVectorTitle) ?? report.freeCoreVectorTitle,
    freeCoreVectorBody: asNonEmptyString(parsed.freeCoreVectorBody) ?? report.freeCoreVectorBody,
    freeOpenInsightTitle:
      asNonEmptyString(parsed.freeOpenInsightTitle) ?? report.freeOpenInsightTitle,
    freeOpenInsightBody: asNonEmptyString(parsed.freeOpenInsightBody) ?? report.freeOpenInsightBody,
    compatibilityFreeInsight:
      report.mode === 'pair'
        ? (asNonEmptyString(parsed.compatibilityFreeInsight) ?? report.compatibilityFreeInsight)
        : report.compatibilityFreeInsight,
    modules: nextModules,
    sourceEngine: 'ephemeris-editorial',
  };
}

export async function enrichUnlockedModulesWithOpenAI(
  report: SolarisFullReport,
  moduleIds: ReportModuleId[],
  rawApiKey: string | undefined,
  rawModel?: string,
): Promise<SolarisFullReport> {
  if (!isOpenAIConfigured(rawApiKey) || moduleIds.length === 0) {
    return report;
  }

  const apiKey = normalizeEnvSecret(rawApiKey);
  const model = normalizeEnvSecret(rawModel) || DEFAULT_OPENAI_MODEL;
  const parsed = await callOpenAIJson(
    apiKey,
    model,
    buildOpenAIUnlockedModulesPrompt(report, moduleIds),
    2200,
    24000,
  );
  if (!parsed || typeof parsed.modules !== 'object' || !parsed.modules) {
    return report;
  }

  const modMap = parsed.modules as Record<string, Record<string, unknown>>;
  const nextModules = { ...report.modules };
  let updatedAny = false;

  for (const id of moduleIds) {
    const incoming = modMap[id];
    if (!incoming || typeof incoming !== 'object') continue;
    const current = nextModules[id];
    const summary = asNonEmptyString(incoming.summary);
    const deepDive = asNonEmptyString(incoming.deepDive);
    const keyActions = asStringArray(incoming.keyActions, 2, 4);
    const avoidList = asStringArray(incoming.avoidList, 2, 3);
    const checkpoint = asNonEmptyString(incoming.checkpoint);

    if (summary || deepDive || keyActions || avoidList || checkpoint) {
      updatedAny = true;
    }

    nextModules[id] = {
      ...current,
      summary: summary ?? current.summary,
      deepDive: deepDive ?? current.deepDive,
      keyActions: keyActions ?? current.keyActions,
      avoidList: avoidList ?? current.avoidList,
      checkpoint: checkpoint ?? current.checkpoint,
    };
  }

  if (!updatedAny) {
    return report;
  }

  return {
    ...report,
    modules: nextModules,
    sourceEngine: 'ephemeris-editorial',
  };
}
