import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  computeDeterministicSolarisReport,
  type PersonInput,
  type QuizAnswers,
  type SolarisFullReport,
} from './src/utils/ephemerisEngine';
import {
  calculateModularPricing,
  type FunnelMode,
  isValidEmailAddress,
  type RelationType,
  type ReportModuleId,
  validateBirthTime,
} from './src/utils/solarisPricing';
import { parsePolishBirthDate } from './src/utils/solarisMatrix';
import {
  findExactCity,
  searchCities,
  type PlaceOption,
} from './src/data/polishEuCities';
import {
  buildDurableOrderConfirmation,
  LEGAL_DOCUMENTS,
  LEGAL_TEXTS,
  renderStaticLegalHtml,
  SELLER_LEGAL_CONFIG,
  type DurableOrderConfirmation,
} from './src/data/legalDocuments';

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

interface ServerUnlockRecord {
  paid: boolean;
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  pdfUnlocked: boolean;
  orderId: string | null;
  firstPurchaseAtMs: number | null;
  confirmation: DurableOrderConfirmation | null;
}

interface StoredSession {
  report: SolarisFullReport;
  unlockState: ServerUnlockRecord;
}

interface ConsentAuditRecord {
  timestamp: string;
  sessionId: string;
  orderId: string;
  regulaminVersion: string;
  ipHash: string;
  termsAndAgeAccepted: boolean;
  withdrawalWaiverAccepted: boolean;
  secondPersonConsentAccepted: boolean | null;
  marketingConsent: boolean;
}

// In-memory stores for sessions, server-verified unlocks, consent audit logs, and Stripe webhook idempotency
const sessionStore = new Map<string, StoredSession>();
const consentAuditLog: ConsentAuditRecord[] = [];
const processedStripeEvents = new Set<string>();
const followUpLeads: Array<{
  email: string;
  sessionId: string;
  marketingConsent: boolean;
  ipHash: string;
  savedAt: string;
}> = [];

// Lightweight sliding-window per-IP rate limiter
const rateLimitBuckets = new Map<string, { count: number; resetAtMs: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'solaris-2027-consent-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);
  if (!existing || now > existing.resetAtMs) {
    rateLimitBuckets.set(key, { count: 1, resetAtMs: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) {
    return false;
  }
  existing.count += 1;
  return true;
}

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((pair) => {
      const [k, v] = pair.split('=');
      return [k?.trim(), v?.trim()];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  // Reject replay older than 5 minutes
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function enrichTeaserWithEditorialEngine(
  report: SolarisFullReport,
): Promise<SolarisFullReport> {
  const ai = getGeminiClient();
  if (!ai) {
    return report;
  }

  const prompt = [
    `Napisz krótkie, wspierające i konkretne teksty po polsku do raportu Solaris 2027.`,
    `STYL: redaktor nowoczesnego polskiego magazynu (Wysokie Obcasy / Noizz). Bez ezoterycznej patetyki (bez słów "magia", "wszechświat", "odkryj siebie").`,
    `ZASADY BEZPIECZEŃSTWA TREŚCI (OBOWIĄZKOWE):`,
    `- ZAKAZ porad medycznych, prawnych, finansowych i inwestycyjnych (nie pisz "kup", "sprzedaj", "rzuć partnera", "zmień pracę", żadnych diagnoz).`,
    `- ZAKAZ straszenia i dat nieuchronnych zdarzeń. Używaj wyłącznie obliczonych okresów z danych poniżej, z ostrożnymi sformułowaniami ("możliwy okres", "warto zwrócić uwagę", "sprzyjający moment na rozmowę").`,
    report.ephemeris.omittedTimeDependentElements
      ? `- UWAGA: godzina urodzenia nie została podana — nie odnosić się do ascendentu ani domów astrologicznych.`
      : ``,
    `DANE OBLICZENIOWE: Imię: ${report.person1.name}, Słońce: ${report.ephemeris.natalSunDeg}° ${report.ephemeris.natalSunSignPl}, Solariusz 2027: ${report.ephemeris.solarReturnDisplayPl}, Jowisz: ${report.ephemeris.jupiterSignPl}, Saturn: ${report.ephemeris.saturnSignPl}, Wenus: ${report.ephemeris.venusSignPl}, Miesiąc wzrostu: ${report.peakMonthPl}, Miesiąc ostrożności: ${report.riskMonthPl}.`,
    report.mode === 'pair' && report.person2
      ? `TRYB PARY (${report.relationType}): Druga osoba: ${report.person2.name}, Indeks zgodności: ${report.compatibilityScore}%.`
      : `TRYB SOLO.`,
    `PROFIL Z QUIZU: Pieniądze: ${report.quizAnswers.money}; Kryzys: ${report.quizAnswers.crisis}; Priorytet: ${report.quizAnswers.priority}; Rytm: ${report.quizAnswers.rhythm}; Wyzwalacz: ${report.quizAnswers.trigger}.`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const timeoutMs = 5500;
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 900,
          systemInstruction:
            'Piszesz jak redaktor nowoczesnego polskiego magazynu: konkretnie, wspierająco, bez ezoterycznej patetyki. Nigdy nie udzielaj porad medycznych, prawnych ani finansowych, nie strasz i nie wymyślaj dat spoza danych wejściowych. Używaj sformułowań warunkowych ("możliwy okres", "warto zwrócić uwagę"). Zwracaj wyłącznie poprawny JSON zgodny ze schematem.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              freeCoreVectorTitle: { type: Type.STRING },
              freeCoreVectorBody: { type: Type.STRING },
              freeOpenInsightTitle: { type: Type.STRING },
              freeOpenInsightBody: { type: Type.STRING },
              compatibilityFreeInsight: { type: Type.STRING },
              finanseTeaserTitle: { type: Type.STRING },
              relacjeTeaserTitle: { type: Type.STRING },
              energiaTeaserTitle: { type: Type.STRING },
              zmianyTeaserTitle: { type: Type.STRING },
              zgodnoscTeaserTitle: { type: Type.STRING },
            },
            required: [
              'freeCoreVectorTitle',
              'freeCoreVectorBody',
              'freeOpenInsightTitle',
              'freeOpenInsightBody',
              'finanseTeaserTitle',
              'relacjeTeaserTitle',
              'energiaTeaserTitle',
              'zmianyTeaserTitle',
            ],
          },
        },
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);

    if (!response) {
      return report;
    }

    const rawText = (response.text ?? '').trim();
    if (!rawText) return report;
    const parsed = JSON.parse(rawText) as Record<string, string>;

    const nextModules = { ...report.modules };
    if (parsed.finanseTeaserTitle) {
      nextModules.finanse = { ...nextModules.finanse, teaserTitle: parsed.finanseTeaserTitle };
    }
    if (parsed.relacjeTeaserTitle) {
      nextModules.relacje = { ...nextModules.relacje, teaserTitle: parsed.relacjeTeaserTitle };
    }
    if (parsed.energiaTeaserTitle) {
      nextModules.energia = { ...nextModules.energia, teaserTitle: parsed.energiaTeaserTitle };
    }
    if (parsed.zmianyTeaserTitle) {
      nextModules.zmiany = { ...nextModules.zmiany, teaserTitle: parsed.zmianyTeaserTitle };
    }
    if (parsed.zgodnoscTeaserTitle && report.mode === 'pair') {
      nextModules.zgodnosc = { ...nextModules.zgodnosc, teaserTitle: parsed.zgodnoscTeaserTitle };
    }

    return {
      ...report,
      freeCoreVectorTitle: parsed.freeCoreVectorTitle || report.freeCoreVectorTitle,
      freeCoreVectorBody: parsed.freeCoreVectorBody || report.freeCoreVectorBody,
      freeOpenInsightTitle: parsed.freeOpenInsightTitle || report.freeOpenInsightTitle,
      freeOpenInsightBody: parsed.freeOpenInsightBody || report.freeOpenInsightBody,
      compatibilityFreeInsight:
        report.mode === 'pair' && parsed.compatibilityFreeInsight
          ? parsed.compatibilityFreeInsight
          : report.compatibilityFreeInsight,
      modules: nextModules,
      sourceEngine: 'ephemeris-editorial',
    };
  } catch (err) {
    console.warn('[Solaris editorial engine fallback]:', err instanceof Error ? err.message : err);
    return report;
  }
}

function parseStructuredCityData(raw: unknown): Pick<PlaceOption, 'name' | 'admin1' | 'country' | 'lat' | 'lon' | 'tz'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    typeof o.lat === 'number' &&
    Number.isFinite(o.lat) &&
    o.lat >= -90 &&
    o.lat <= 90 &&
    typeof o.lon === 'number' &&
    Number.isFinite(o.lon) &&
    o.lon >= -180 &&
    o.lon <= 180 &&
    typeof o.tz === 'string' &&
    o.tz.trim().length > 0
  ) {
    return {
      name: o.name.trim().slice(0, 80),
      admin1: typeof o.admin1 === 'string' ? o.admin1.trim().slice(0, 80) : '',
      country: typeof o.country === 'string' ? o.country.trim().slice(0, 80) : 'Polska',
      lat: o.lat,
      lon: o.lon,
      tz: o.tz.trim().slice(0, 64),
    };
  }
  return null;
}

function validatePersonPayload(
  raw: unknown,
  label: string,
): { ok: true; value: PersonInput } | { ok: false; error: string; code: 'VALIDATION_ERROR' | 'PLACE_NOT_FOUND' } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: `${label}: brak wymaganych danych.`, code: 'VALIDATION_ERROR' };
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 60) : '';
  const birthDate = typeof obj.birthDate === 'string' ? obj.birthDate.trim().slice(0, 20) : '';
  const birthTime = typeof obj.birthTime === 'string' ? obj.birthTime.trim().slice(0, 10) : '';
  const timeUnknown = Boolean(obj.timeUnknown);
  const city = typeof obj.city === 'string' ? obj.city.trim().slice(0, 100) : '';
  const structuredCity = parseStructuredCityData(obj.cityData);

  if (name.length < 2) {
    return { ok: false, error: `${label}: wpisz imię lub pseudonim (min. 2 znaki).`, code: 'VALIDATION_ERROR' };
  }
  const dateCheck = parsePolishBirthDate(birthDate);
  if (!dateCheck.ok) {
    return { ok: false, error: `${label}: ${dateCheck.error}`, code: 'VALIDATION_ERROR' };
  }
  const timeCheck = validateBirthTime(birthTime, timeUnknown);
  if (!timeCheck.ok) {
    return { ok: false, error: `${label}: ${timeCheck.error}`, code: 'VALIDATION_ERROR' };
  }

  let resolvedCityData = structuredCity;
  if (!resolvedCityData) {
    const exact = findExactCity(city);
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
      return {
        ok: false,
        error: `${label}: ${LEGAL_TEXTS.cityNotFoundError}`,
        code: 'PLACE_NOT_FOUND',
      };
    }
  }

  return {
    ok: true,
    value: {
      name,
      birthDate: dateCheck.value.formatted,
      birthTime: timeUnknown ? '' : timeCheck.normalized,
      timeUnknown,
      city: resolvedCityData.name,
      cityData: resolvedCityData,
    },
  };
}

function getBaseUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL' && configured.startsWith('http')) {
    return configured.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

async function startServer() {
  const app = express();

  // Stripe webhook requires raw body for HMAC signature verification (must be registered before express.json)
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '256kb' }),
    (req, res) => {
      const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
      const sig = req.headers['stripe-signature'] as string | undefined;

      if (!secret) {
        return res.status(503).json({
          error: 'Stripe webhook secret is not configured on this server.',
        });
      }

      if (!verifyStripeSignature(rawBody, sig, secret)) {
        return res.status(400).json({ error: 'Invalid Stripe-Signature header.' });
      }

      try {
        const event = JSON.parse(rawBody) as {
          id?: string;
          type?: string;
          data?: {
            object?: {
              id?: string;
              metadata?: {
                sessionId?: string;
                modules?: string;
                calendar?: string;
                pdf?: string;
                priceGrossPln?: string;
              };
            };
          };
        };

        if (!event.id || processedStripeEvents.has(event.id)) {
          return res.json({ received: true, duplicate: true });
        }
        processedStripeEvents.add(event.id);

        if (event.type === 'checkout.session.completed') {
          const obj = event.data?.object;
          const sessionId = obj?.metadata?.sessionId;
          if (sessionId && sessionStore.has(sessionId)) {
            const stored = sessionStore.get(sessionId)!;
            const allowed: Set<string> = new Set([
              'finanse',
              'relacje',
              'energia',
              'zmiany',
              'zgodnosc',
            ]);
            const modules = (obj?.metadata?.modules || '')
              .split(',')
              .filter((m): m is ReportModuleId => allowed.has(m));
            const orderId = obj?.id || `SOL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            const confirmation = buildDurableOrderConfirmation({
              orderId,
              personName: stored.report.person1.name,
              mode: stored.report.mode,
              priceGrossPln: obj?.metadata?.priceGrossPln || '14,99 zł',
              sessionId,
              baseUrl: getBaseUrl(req),
            });

            stored.unlockState = {
              paid: true,
              unlockedModules: Array.from(
                new Set([...stored.unlockState.unlockedModules, ...modules]),
              ),
              calendarUnlocked:
                stored.unlockState.calendarUnlocked || obj?.metadata?.calendar === 'true',
              pdfUnlocked: stored.unlockState.pdfUnlocked || obj?.metadata?.pdf === 'true',
              orderId,
              firstPurchaseAtMs: stored.unlockState.firstPurchaseAtMs ?? Date.now(),
              confirmation,
            };
          }
        }

        return res.json({ received: true });
      } catch (err) {
        console.error('[POST /api/webhooks/stripe]', err);
        return res.status(400).json({ error: 'Malformed Stripe event payload.' });
      }
    },
  );

  app.use(express.json({ limit: '100kb' }));

  // Static HTML Legal Pages (visible to Stripe, TikTok, Meta crawlers without JS!)
  app.get('/regulamin', (_req, res) => {
    res.type('html').send(renderStaticLegalHtml(LEGAL_DOCUMENTS.regulamin));
  });
  app.get('/polityka-prywatnosci', (_req, res) => {
    res.type('html').send(renderStaticLegalHtml(LEGAL_DOCUMENTS.polityka));
  });
  app.get('/polityka-cookies', (_req, res) => {
    res.type('html').send(renderStaticLegalHtml(LEGAL_DOCUMENTS.cookies));
  });
  app.get('/odstapienie', (_req, res) => {
    res.type('html').send(renderStaticLegalHtml(LEGAL_DOCUMENTS.odstapienie));
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'solaris-2027' });
  });

  // Autocomplete endpoint returning structured place records with IANA timezone
  app.get('/api/places', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(12, rawLimit)) : 8;
    const matches = searchCities(q, limit).map(({ name, admin1, country, lat, lon, tz }) => ({
      name,
      admin1,
      country,
      lat,
      lon,
      tz,
    }));
    return res.json({ places: matches });
  });

  // Server-authoritative report lookup (ignores any client-side ?paid=1 manipulation)
  app.get('/api/report/:sessionId', (req, res) => {
    const sessionId = String(req.params.sessionId || '').trim().slice(0, 64);
    const stored = sessionStore.get(sessionId);
    if (!stored) {
      return res.status(404).json({
        code: 'SESSION_NOT_FOUND',
        error: 'Nie znaleźliśmy zapisanego raportu dla tego identyfikatora.',
      });
    }
    return res.json({
      report: stored.report,
      unlockState: stored.unlockState,
    });
  });

  app.post('/api/report/teaser', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`teaser:${ip}`, 30, 15 * 60 * 1000)) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        error: 'Zbyt wiele prób obliczeń w krótkim czasie. Odczekaj minutę i spróbuj ponownie.',
      });
    }

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const mode: FunnelMode = body.mode === 'pair' ? 'pair' : 'solo';
      const relationType: RelationType | null =
        mode === 'pair'
          ? body.relationType === 'przyjaciele' || body.relationType === 'biznes'
            ? body.relationType
            : 'para'
          : null;

      const p1 = validatePersonPayload(body.person1, 'Twoje dane');
      if (!p1.ok) {
        return res.status(400).json({ code: p1.code, error: p1.error });
      }

      let p2: PersonInput | null = null;
      if (mode === 'pair') {
        const p2Check = validatePersonPayload(body.person2, 'Druga osoba');
        if (!p2Check.ok) {
          return res.status(400).json({ code: p2Check.code, error: p2Check.error });
        }
        p2 = p2Check.value;
      }

      const rawQuiz = (body.quizAnswers ?? {}) as Record<string, unknown>;
      const quizAnswers: QuizAnswers = {
        money: String(rawQuiz.money ?? '').slice(0, 140) || 'Chcę zwiększyć dochód i podnieść stawki',
        crisis: String(rawQuiz.crisis ?? '').slice(0, 140) || 'Tnę straty od razu i szukam planu B',
        priority: String(rawQuiz.priority ?? '').slice(0, 140) || 'Stagnacja w pracy lub zarobkach',
        rhythm: String(rawQuiz.rhythm ?? '').slice(0, 140) || 'Spokojny plan rozpisany na kwartały',
        trigger: String(rawQuiz.trigger ?? '').slice(0, 140) || 'Brak konkretu i zmienianie zdania w ostatniej chwili',
      };

      // Minimum 128-bit unpredictable session ID (UUIDv4)
      const sessionId = crypto.randomUUID();
      const baseReport = computeDeterministicSolarisReport({
        sessionId,
        mode,
        relationType,
        person1: p1.value,
        person2: p2,
        quizAnswers,
      });

      const report = await enrichTeaserWithEditorialEngine(baseReport);
      const initialUnlock: ServerUnlockRecord = {
        paid: false,
        unlockedModules: [],
        calendarUnlocked: false,
        pdfUnlocked: false,
        orderId: null,
        firstPurchaseAtMs: null,
        confirmation: null,
      };

      sessionStore.set(sessionId, { report, unlockState: initialUnlock });

      return res.json({ report, unlockState: initialUnlock });
    } catch (err) {
      console.error('[POST /api/report/teaser]', err);
      return res.status(500).json({
        code: 'CALC_ERROR',
        error: LEGAL_TEXTS.serverCalcError,
      });
    }
  });

  app.post('/api/report/unlock', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`unlock:${ip}`, 25, 15 * 60 * 1000)) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        error: 'Zbyt wiele prób płatności. Odczekaj chwilę i spróbuj ponownie.',
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : '';
    const mode: FunnelMode = body.mode === 'pair' ? 'pair' : 'solo';

    // Server-side validation of ALL required unchecked consents
    const termsAndAgeAccepted = body.termsAndAgeAccepted === true;
    const withdrawalWaiverAccepted = body.withdrawalWaiverAccepted === true;
    const secondPersonConsentAccepted = body.secondPersonConsentAccepted === true;
    const marketingConsent = body.marketingConsent === true;

    if (!termsAndAgeAccepted) {
      return res.status(400).json({
        code: 'CONSENT_REQUIRED',
        error: 'Zaznacz potwierdzenie ukończenia 18 lat oraz akceptację Regulaminu i Polityki prywatności.',
      });
    }

    if (!withdrawalWaiverAccepted) {
      return res.status(400).json({
        code: 'CONSENT_REQUIRED',
        error:
          'Zaznacz zgodę na rozpoczęcie dostarczania Raportu przed upływem 14 dni oraz informację o utracie prawa odstąpienia.',
      });
    }

    if (mode === 'pair' && !secondPersonConsentAccepted) {
      return res.status(400).json({
        code: 'CONSENT_REQUIRED',
        error:
          'W trybie „Dla dwojga” wymagane jest oświadczenie dotyczące pełnoletności i poinformowania drugiej osoby.',
      });
    }

    const allowed: Set<string> = new Set(['finanse', 'relacje', 'energia', 'zmiany', 'zgodnosc']);
    const rawMods = Array.isArray(body.selectedModules) ? body.selectedModules : [];
    const selectedModules = rawMods.filter(
      (id): id is ReportModuleId => typeof id === 'string' && allowed.has(id),
    );

    if (selectedModules.length === 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: 'Wybierz co najmniej jeden moduł raportu.',
      });
    }

    const pricing = calculateModularPricing({
      mode,
      selectedModules,
      includeCalendarBump: Boolean(body.includeCalendarBump),
      hasRetentionDiscount: Boolean(body.hasRetentionDiscount),
      useDownsellOffer: Boolean(body.useDownsellOffer),
    });

    const orderId = `SOL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const stored = sessionStore.get(sessionId);
    const personName = stored?.report.person1.name || (typeof body.personName === 'string' ? body.personName.slice(0, 60) : 'Kliencie');

    // Audit consent record (timestamp + regulamin version + one-way IP hash)
    consentAuditLog.push({
      timestamp: new Date().toISOString(),
      sessionId: sessionId || 'unknown',
      orderId,
      regulaminVersion: SELLER_LEGAL_CONFIG.regulaminVersion,
      ipHash: hashIp(ip),
      termsAndAgeAccepted,
      withdrawalWaiverAccepted,
      secondPersonConsentAccepted: mode === 'pair' ? secondPersonConsentAccepted : null,
      marketingConsent,
    });

    const calendarUnlocked =
      pricing.includesFreeCalendarAndPdf ||
      Boolean(body.includeCalendarBump) ||
      Boolean(body.useDownsellOffer);
    const pdfUnlocked = pricing.includesFreeCalendarAndPdf;

    const confirmation = buildDurableOrderConfirmation({
      orderId,
      personName,
      mode,
      priceGrossPln: pricing.formattedFinalPln,
      sessionId: sessionId || orderId,
      baseUrl: getBaseUrl(req),
    });

    const nextUnlock: ServerUnlockRecord = {
      paid: true,
      unlockedModules: stored
        ? Array.from(new Set([...stored.unlockState.unlockedModules, ...selectedModules]))
        : selectedModules,
      calendarUnlocked: (stored?.unlockState.calendarUnlocked ?? false) || calendarUnlocked,
      pdfUnlocked: (stored?.unlockState.pdfUnlocked ?? false) || pdfUnlocked,
      orderId,
      firstPurchaseAtMs: stored?.unlockState.firstPurchaseAtMs ?? Date.now(),
      confirmation,
    };

    if (stored) {
      stored.unlockState = nextUnlock;
    }

    return res.json({
      ok: true,
      paid: true,
      orderId,
      unlockedModules: nextUnlock.unlockedModules,
      calendarUnlocked: nextUnlock.calendarUnlocked,
      pdfUnlocked: nextUnlock.pdfUnlocked,
      paidPln: pricing.formattedFinalPln,
      confirmation,
    });
  });

  app.post('/api/followup/save', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`followup:${ip}`, 15, 15 * 60 * 1000)) {
      return res.status(429).json({
        error: 'Zbyt wiele zgłoszeń. Spróbuj ponownie za kilka minut.',
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 120) : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : 'guest';
    const marketingConsent = body.marketingConsent === true;

    if (!isValidEmailAddress(email)) {
      return res.status(400).json({
        error: 'Podaj poprawny adres e-mail, aby zapisać raport i kod zniżkowy.',
      });
    }

    if (!marketingConsent) {
      return res.status(400).json({
        error: 'Zaznacz dobrowolną zgodę na otrzymywanie wiadomości e-mail, aby zapisać adres.',
      });
    }

    followUpLeads.push({
      email,
      sessionId,
      marketingConsent: true,
      ipHash: hashIp(ip),
      savedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: 'Zapisaliśmy Twój adres oraz rabat -20% na pełny pakiet. Zgodę możesz wycofać w każdej chwili.',
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Solaris 2027 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
