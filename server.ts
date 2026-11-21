import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
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

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// In-memory store for active preview sessions and non-buyer follow-up reminders
const sessionStore = new Map<string, SolarisFullReport>();
const followUpLeads: Array<{ email: string; sessionId: string; savedAt: string }> = [];

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
    `Napisz krótkie, konkretne teksty po polsku do raportu Solaris 2027.`,
    `STYL: redaktor nowoczesnego polskiego magazynu (Wysokie Obcasy / Noizz). Zero wody, zero słów "magia", "wszechświat", "odkryj siebie", "AI", "sztuczna inteligencja", "algorytm". Format: ból -> fakt.`,
    `DANE EFEMERYD: Imię: ${report.person1.name}, Słońce: ${report.ephemeris.natalSunDeg}° ${report.ephemeris.natalSunSignPl}, Solariusz 2027: ${report.ephemeris.solarReturnDisplayPl}, Jowisz: ${report.ephemeris.jupiterSignPl}, Saturn: ${report.ephemeris.saturnSignPl}, Wenus: ${report.ephemeris.venusSignPl}, Szczyt: ${report.peakMonthPl}, Miesiąc napięć: ${report.riskMonthPl}.`,
    report.mode === 'pair' && report.person2
      ? `TRYB PARY (${report.relationType}): Druga osoba: ${report.person2.name}, Zgodność: ${report.compatibilityScore}%.`
      : `TRYB SOLO.`,
    `PROFIL DECYZYJNY: Pieniądze: ${report.quizAnswers.money}; Kryzys: ${report.quizAnswers.crisis}; Priorytet: ${report.quizAnswers.priority}; Rytm: ${report.quizAnswers.rhythm}; Wyzwalacz: ${report.quizAnswers.trigger}.`,
  ].join('\n');

  try {
    const timeoutMs = 5500;
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Piszesz jak redaktor Wysokich Obcasów i Noizz: ostro, konkretnie, po polsku, bez ezoterycznej patetyki i bez wzmianek o AI/LLM. Zwracaj wyłącznie poprawny JSON zgodny ze schematem.',
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

function validatePersonPayload(raw: unknown, label: string): { ok: true; value: PersonInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: `${label}: brak wymaganych danych.` };
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 60) : '';
  const birthDate = typeof obj.birthDate === 'string' ? obj.birthDate.trim().slice(0, 20) : '';
  const birthTime = typeof obj.birthTime === 'string' ? obj.birthTime.trim().slice(0, 10) : '12:00';
  const timeUnknown = Boolean(obj.timeUnknown);
  const city = typeof obj.city === 'string' ? obj.city.trim().slice(0, 80) : '';

  if (name.length < 2) {
    return { ok: false, error: `${label}: wpisz imię (min. 2 znaki).` };
  }
  const dateCheck = parsePolishBirthDate(birthDate);
  if (!dateCheck.ok) {
    return { ok: false, error: `${label}: ${dateCheck.error}` };
  }
  const timeCheck = validateBirthTime(birthTime, timeUnknown);
  if (!timeCheck.ok) {
    return { ok: false, error: `${label}: ${timeCheck.error}` };
  }
  if (city.length < 2) {
    return { ok: false, error: `${label}: wybierz lub wpisz miasto urodzenia.` };
  }

  return {
    ok: true,
    value: {
      name,
      birthDate: dateCheck.value.formatted,
      birthTime: timeCheck.normalized,
      timeUnknown,
      city,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'solaris-2027' });
  });

  app.post('/api/report/teaser', async (req, res) => {
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
        return res.status(400).json({ error: p1.error });
      }

      let p2: PersonInput | null = null;
      if (mode === 'pair') {
        const p2Check = validatePersonPayload(body.person2, 'Druga osoba');
        if (!p2Check.ok) {
          return res.status(400).json({ error: p2Check.error });
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

      const sessionId = crypto.randomBytes(8).toString('hex');
      const baseReport = computeDeterministicSolarisReport({
        sessionId,
        mode,
        relationType,
        person1: p1.value,
        person2: p2,
        quizAnswers,
      });

      const report = await enrichTeaserWithEditorialEngine(baseReport);
      sessionStore.set(sessionId, report);

      return res.json({ report });
    } catch (err) {
      console.error('[POST /api/report/teaser]', err);
      return res.status(500).json({
        error: 'Nie udało się obliczyć matrycy solarnej. Spróbuj ponownie za chwilę.',
      });
    }
  });

  app.post('/api/report/unlock', (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const waiverAccepted = body.withdrawalWaiverAccepted === true;
    if (!waiverAccepted) {
      return res.status(400).json({
        error: 'Aby przejść dalej, zaakceptuj zgodę na dostarczenie treści cyfrowych przed upływem terminu odstąpienia.',
      });
    }

    const mode: FunnelMode = body.mode === 'pair' ? 'pair' : 'solo';
    const allowed: Set<string> = new Set(['finanse', 'relacje', 'energia', 'zmiany', 'zgodnosc']);
    const rawMods = Array.isArray(body.selectedModules) ? body.selectedModules : [];
    const selectedModules = rawMods.filter(
      (id): id is ReportModuleId => typeof id === 'string' && allowed.has(id),
    );

    if (selectedModules.length === 0) {
      return res.status(400).json({
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

    return res.json({
      ok: true,
      orderId: `SOL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      unlockedModules: selectedModules,
      calendarUnlocked:
        pricing.includesFreeCalendarAndPdf || Boolean(body.includeCalendarBump) || Boolean(body.useDownsellOffer),
      pdfUnlocked: pricing.includesFreeCalendarAndPdf,
      paidPln: pricing.formattedFinalPln,
    });
  });

  app.post('/api/followup/save', (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 120) : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : 'guest';

    if (!isValidEmailAddress(email)) {
      return res.status(400).json({
        error: 'Podaj poprawny adres e-mail, aby zapisać raport i kod zniżkowy.',
      });
    }

    followUpLeads.push({
      email,
      sessionId,
      savedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: 'Zapisaliśmy Twój bezpłatny skrót matrycy 2027 oraz rabat -20% na pełny pakiet.',
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
