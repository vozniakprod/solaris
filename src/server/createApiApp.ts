import crypto from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import {
  computeDeterministicSolarisReport,
  type PersonInput,
  type QuizAnswers,
  type SolarisFullReport,
} from '../utils/ephemerisEngine.js';
import {
  calculateModularPricing,
  formatPlnFromGrosze,
  type FunnelMode,
  getAvailableModulesForMode,
  isValidEmailAddress,
  POST_PURCHASE_UPSELL_GROSZE,
  type RelationType,
  type ReportModuleId,
  validateBirthTime,
} from '../utils/solarisPricing.js';
import { parsePolishBirthDate } from '../utils/solarisMatrix.js';
import {
  findExactCity,
  searchCities,
  type PlaceOption,
} from '../data/polishEuCities.js';
import {
  buildDurableOrderConfirmation,
  LEGAL_DOCUMENTS,
  LEGAL_TEXTS,
  renderStaticLegalHtml,
  SELLER_LEGAL_CONFIG,
  type DurableOrderConfirmation,
} from '../data/legalDocuments.js';
import {
  createStripeCheckoutSession,
  diagnoseStripeSecretKey,
  getStripeRuntimeMode,
  isValidStripeCheckoutSessionId,
  normalizeStripeEnvValue,
  parseModulesFromMetadata,
  retrieveStripeCheckoutSession,
  type StripeCheckoutSessionObject,
  verifyStripeWebhookSignature,
} from '../utils/stripeServer.js';
import {
  enrichTeaserWithOpenAI,
  enrichUnlockedModulesWithOpenAI,
} from '../utils/openaiEditorial.js';
import {
  buildFollowUpReminderEmailPayload,
  buildFullReportEmailPayload,
  isResendConfigured,
  maskEmailForUi,
  sendEmailViaResend,
} from '../utils/emailDelivery.js';

export interface ServerUnlockRecord {
  paid: boolean;
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  pdfUnlocked: boolean;
  orderId: string | null;
  lastStripeSessionId?: string | null;
  customerEmail?: string | null;
  emailDeliveredTo?: string | null;
  firstPurchaseAtMs: number | null;
  confirmation: DurableOrderConfirmation | null;
}

interface StoredSession {
  report: SolarisFullReport;
  unlockState: ServerUnlockRecord;
  aiEnrichedModules: Set<ReportModuleId>;
}

interface ConsentAuditRecord {
  timestamp: string;
  sessionId: string;
  orderId: string;
  stripeSessionId: string | null;
  status: 'checkout_created' | 'paid';
  regulaminVersion: string;
  ipHash: string;
  termsAndAgeAccepted: boolean;
  withdrawalWaiverAccepted: boolean;
  secondPersonConsentAccepted: boolean | null;
  marketingConsent: boolean;
}

// In-memory stores for warm server instances, consent audit logs, and Stripe idempotency.
// Checkout & verification remain stateless-safe across Vercel cold starts via Stripe Checkout metadata.
const sessionStore = new Map<string, StoredSession>();
const consentAuditLog: ConsentAuditRecord[] = [];
const processedStripeEvents = new Set<string>();
const verifiedStripeSessions = new Map<string, ServerUnlockRecord>();
const autoSentEmailSessions = new Set<string>();
const emailSendCountByStripeSession = new Map<string, number>();
const MAX_EMAIL_SENDS_PER_PAID_SESSION = 3;
const followUpLeads: Array<{
  email: string;
  sessionId: string;
  marketingConsent: boolean;
  ipHash: string;
  savedAt: string;
}> = [];

// Auto-generated cryptographic salt for one-way IP hashing (no manual configuration needed)
const RUNTIME_IP_HASH_SALT =
  process.env.IP_HASH_SALT?.trim() || crypto.randomBytes(32).toString('hex');

// Lightweight sliding-window per-IP rate limiter
const rateLimitBuckets = new Map<string, { count: number; resetAtMs: number }>();

const SAFE_HOST_PATTERN = /^[a-zA-Z0-9.-]+(:\d{1,5})?$/;

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(`${RUNTIME_IP_HASH_SALT}:${ip}`)
    .digest('hex')
    .slice(0, 32);
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

export function resolveSafeBaseUrl(req: Request, fallbackPort = 3000): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL' && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  const rawProto = Array.isArray(req.headers['x-forwarded-proto'])
    ? req.headers['x-forwarded-proto'][0]
    : req.headers['x-forwarded-proto'];
  const firstProto = typeof rawProto === 'string' ? rawProto.split(',')[0].trim().toLowerCase() : '';
  const proto =
    firstProto === 'https' || firstProto === 'http'
      ? firstProto
      : process.env.VERCEL
        ? 'https'
        : req.protocol === 'https'
          ? 'https'
          : 'http';

  const rawForwardedHost = Array.isArray(req.headers['x-forwarded-host'])
    ? req.headers['x-forwarded-host'][0]
    : req.headers['x-forwarded-host'];
  const candidateHost = (
    (typeof rawForwardedHost === 'string' ? rawForwardedHost.split(',')[0].trim() : '') ||
    (typeof req.headers.host === 'string' ? req.headers.host.trim() : '') ||
    (process.env.VERCEL_URL ? process.env.VERCEL_URL.trim() : '')
  ).toLowerCase();

  const safeHost = SAFE_HOST_PATTERN.test(candidateHost)
    ? candidateHost
    : `localhost:${fallbackPort}`;

  return `${proto}://${safeHost}`;
}

function applyVerifiedStripeUnlock(
  stripeSession: StripeCheckoutSessionObject,
  baseUrl: string,
): ServerUnlockRecord | null {
  const meta = stripeSession.metadata;
  const sessionId = meta?.sessionId?.trim();
  if (!sessionId) return null;

  const modules = parseModulesFromMetadata(meta?.modules);
  const mode: FunnelMode = meta?.mode === 'pair' ? 'pair' : 'solo';
  const stored = sessionStore.get(sessionId);
  const personName = stored?.report.person1.name || meta?.personName || 'Kliencie';
  const orderId =
    meta?.orderId ||
    stripeSession.id ||
    `SOL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const priceGrossPln =
    meta?.priceGrossPln ||
    (typeof stripeSession.amount_total === 'number'
      ? formatPlnFromGrosze(stripeSession.amount_total)
      : '14,99 zł');

  const confirmation = buildDurableOrderConfirmation({
    orderId,
    personName,
    mode,
    priceGrossPln,
    sessionId,
    baseUrl,
  });

  const prev = stored?.unlockState;
  const stripeCreatedMs =
    typeof stripeSession.created === 'number' && Number.isFinite(stripeSession.created)
      ? stripeSession.created * 1000
      : Date.now();
  const customerEmail =
    stripeSession.customer_details?.email?.trim() || prev?.customerEmail || null;
  const nextUnlock: ServerUnlockRecord = {
    paid: true,
    unlockedModules: Array.from(new Set([...(prev?.unlockedModules ?? []), ...modules])),
    calendarUnlocked: (prev?.calendarUnlocked ?? false) || meta?.calendar === 'true',
    pdfUnlocked: (prev?.pdfUnlocked ?? false) || meta?.pdf === 'true',
    orderId,
    lastStripeSessionId: stripeSession.id,
    customerEmail,
    emailDeliveredTo: prev?.emailDeliveredTo ?? null,
    firstPurchaseAtMs: prev?.firstPurchaseAtMs ?? stripeCreatedMs,
    confirmation,
  };

  if (stored) {
    stored.unlockState = nextUnlock;
  }
  verifiedStripeSessions.set(stripeSession.id, nextUnlock);

  for (let i = consentAuditLog.length - 1; i >= 0; i -= 1) {
    const rec = consentAuditLog[i];
    if (rec.stripeSessionId === stripeSession.id || rec.orderId === orderId) {
      rec.status = 'paid';
      break;
    }
  }

  return nextUnlock;
}

async function deliverPaidReportEmail(params: {
  stripeSession: StripeCheckoutSessionObject;
  report: SolarisFullReport;
  unlockState: ServerUnlockRecord;
  baseUrl: string;
  overrideRecipient?: string;
  forceResend?: boolean;
}): Promise<{
  sent: boolean;
  alreadySent?: boolean;
  reason?:
    | 'not_configured'
    | 'missing_recipient'
    | 'limit_reached'
    | 'invalid_recipient'
    | 'provider_error'
    | 'network_error';
  deliveredTo?: string;
  error?: string;
}> {
  const { stripeSession, report, unlockState, baseUrl, overrideRecipient, forceResend } = params;

  const trimmedOverride = overrideRecipient?.trim() || '';
  const recipient = trimmedOverride || stripeSession.customer_details?.email?.trim() || unlockState.customerEmail || '';
  if (!recipient || !isValidEmailAddress(recipient)) {
    return { sent: false, reason: 'missing_recipient' };
  }

  if (!forceResend && autoSentEmailSessions.has(stripeSession.id)) {
    return {
      sent: true,
      alreadySent: true,
      deliveredTo: unlockState.emailDeliveredTo || maskEmailForUi(recipient),
    };
  }

  const currentSends = emailSendCountByStripeSession.get(stripeSession.id) ?? 0;
  if (currentSends >= MAX_EMAIL_SENDS_PER_PAID_SESSION) {
    return {
      sent: false,
      reason: 'limit_reached',
      error: 'Osiągnięto limit 3 wysyłek e-mail dla tego zamówienia. Zapisz raport jako PDF A4 poniżej.',
    };
  }

  if (!isResendConfigured(process.env.RESEND_API_KEY)) {
    return { sent: false, reason: 'not_configured' };
  }

  const confirmation =
    unlockState.confirmation ??
    buildDurableOrderConfirmation({
      orderId: unlockState.orderId || stripeSession.id,
      personName: report.person1.name,
      mode: report.mode,
      priceGrossPln:
        stripeSession.metadata?.priceGrossPln ||
        (typeof stripeSession.amount_total === 'number'
          ? formatPlnFromGrosze(stripeSession.amount_total)
          : '14,99 zł'),
      sessionId: report.sessionId,
      baseUrl,
    });

  const payload = buildFullReportEmailPayload({
    report,
    unlockedModules: unlockState.unlockedModules,
    calendarUnlocked: unlockState.calendarUnlocked,
    confirmation,
    baseUrl,
  });

  const sendResult = await sendEmailViaResend({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    to: recipient,
    payload,
  });

  if (!sendResult.ok) {
    return {
      sent: false,
      reason: sendResult.reason,
      error: sendResult.error,
    };
  }

  const masked = maskEmailForUi(recipient);
  emailSendCountByStripeSession.set(stripeSession.id, currentSends + 1);
  autoSentEmailSessions.add(stripeSession.id);
  unlockState.emailDeliveredTo = masked;
  if (!unlockState.customerEmail) {
    unlockState.customerEmail = recipient;
  }
  verifiedStripeSessions.set(stripeSession.id, unlockState);
  const stored = sessionStore.get(report.sessionId);
  if (stored) {
    stored.unlockState = unlockState;
  }

  return {
    sent: true,
    deliveredTo: masked,
  };
}

async function enrichTeaserWithEditorialEngine(
  report: SolarisFullReport,
): Promise<SolarisFullReport> {
  return enrichTeaserWithOpenAI(
    report,
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_MODEL,
  );
}

async function ensureUnlockedModulesEnriched(sessionId: string): Promise<void> {
  const stored = sessionStore.get(sessionId);
  if (!stored || !stored.unlockState.paid) return;
  const pending = stored.unlockState.unlockedModules.filter(
    (m) => !stored.aiEnrichedModules.has(m),
  );
  if (pending.length === 0) return;
  const enriched = await enrichUnlockedModulesWithOpenAI(
    stored.report,
    pending,
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_MODEL,
  );
  stored.report = enriched;
  for (const m of pending) {
    stored.aiEnrichedModules.add(m);
  }
}

function parseStructuredCityData(
  raw: unknown,
): Pick<PlaceOption, 'name' | 'admin1' | 'country' | 'lat' | 'lon' | 'tz'> | null {
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
):
  | { ok: true; value: PersonInput }
  | { ok: false; error: string; code: 'VALIDATION_ERROR' | 'PLACE_NOT_FOUND' } {
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
    return {
      ok: false,
      error: `${label}: wpisz imię lub pseudonim (min. 2 znaki).`,
      code: 'VALIDATION_ERROR',
    };
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

export function createApiApp(options?: { fallbackPort?: number }): Express {
  const fallbackPort = options?.fallbackPort ?? (Number(process.env.PORT) || 3000);
  const app = express();
  app.set('trust proxy', 1);

  // Stripe webhook requires raw body for HMAC signature verification (must be registered before express.json)
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '256kb' }),
    (req, res) => {
      const secret = normalizeStripeEnvValue(process.env.STRIPE_WEBHOOK_SECRET);
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : '';
      const sig = req.headers['stripe-signature'] as string | undefined;

      if (!secret) {
        return res.status(503).json({
          error: 'Stripe webhook secret is not configured on this server.',
        });
      }

      if (!rawBody || !verifyStripeWebhookSignature(rawBody, sig, secret)) {
        return res.status(400).json({ error: 'Invalid Stripe-Signature header.' });
      }

      try {
        const event = JSON.parse(rawBody) as {
          id?: string;
          type?: string;
          data?: {
            object?: StripeCheckoutSessionObject;
          };
        };

        if (!event.id || processedStripeEvents.has(event.id)) {
          return res.json({ received: true, duplicate: true });
        }
        processedStripeEvents.add(event.id);

        if (
          event.type === 'checkout.session.completed' ||
          event.type === 'checkout.session.async_payment_succeeded'
        ) {
          const obj = event.data?.object;
          if (obj && obj.payment_status === 'paid') {
            const baseUrl = resolveSafeBaseUrl(req, fallbackPort);
            const unlock = applyVerifiedStripeUnlock(obj, baseUrl);
            const sid = obj.metadata?.sessionId?.trim();
            if (unlock && sid && !autoSentEmailSessions.has(obj.id)) {
              const stored = sessionStore.get(sid);
              if (stored) {
                void (async () => {
                  try {
                    await ensureUnlockedModulesEnriched(sid);
                    await deliverPaidReportEmail({
                      stripeSession: obj,
                      report: stored.report,
                      unlockState: stored.unlockState,
                      baseUrl,
                    });
                  } catch (mailErr) {
                    console.warn('[webhook report email]', mailErr);
                  }
                })();
              }
            }
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

  // Static HTML Legal Pages (visible to Stripe, TikTok, Meta crawlers without JS)
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

  // Safe non-secret Stripe & Email runtime availability for client
  app.get('/api/payments/config', (_req, res) => {
    const mode = getStripeRuntimeMode(process.env.STRIPE_SECRET_KEY);
    res.json({
      stripeEnabled: mode !== 'unconfigured',
      mode,
      emailConfigured: isResendConfigured(process.env.RESEND_API_KEY),
    });
  });

  // Server-side verification of a completed Stripe Checkout Session (never trusts ?paid=1)
  app.get('/api/checkout/verify', async (req, res) => {
    const stripeSecretKey = normalizeStripeEnvValue(process.env.STRIPE_SECRET_KEY);
    if (getStripeRuntimeMode(stripeSecretKey) === 'unconfigured') {
      return res.status(503).json({
        code: 'STRIPE_NOT_CONFIGURED',
        error: 'Płatności Stripe nie są skonfigurowane na serwerze.',
      });
    }

    const sessionId =
      typeof req.query.sessionId === 'string' ? req.query.sessionId.trim().slice(0, 64) : '';
    const stripeSessionId =
      typeof req.query.stripe_session_id === 'string'
        ? req.query.stripe_session_id.trim().slice(0, 128)
        : '';

    if (!sessionId || !isValidStripeCheckoutSessionId(stripeSessionId)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: 'Brak prawidłowego identyfikatora sesji płatności Stripe.',
      });
    }

    const cached = verifiedStripeSessions.get(stripeSessionId);
    if (cached) {
      await ensureUnlockedModulesEnriched(sessionId);
      const stored = sessionStore.get(sessionId);
      const activeUnlock = stored?.unlockState ?? cached;
      return res.json({
        ok: true,
        verified: true,
        paymentStatus: 'paid',
        unlockState: activeUnlock,
        report: stored?.report ?? null,
        emailConfigured: isResendConfigured(process.env.RESEND_API_KEY),
        emailDeliveredTo: activeUnlock.emailDeliveredTo ?? null,
      });
    }

    try {
      const lookup = await retrieveStripeCheckoutSession(stripeSessionId, stripeSecretKey);
      if (!lookup.ok) {
        return res.status(lookup.status).json({
          code: 'STRIPE_LOOKUP_ERROR',
          error: lookup.error,
        });
      }

      const stripeSession = lookup.session;
      if (stripeSession.metadata?.sessionId !== sessionId) {
        return res.status(403).json({
          code: 'SESSION_MISMATCH',
          error: 'Sesja płatności nie pasuje do tego raportu.',
        });
      }

      if (stripeSession.payment_status !== 'paid') {
        return res.json({
          ok: true,
          verified: false,
          paymentStatus: stripeSession.payment_status,
        });
      }

      const baseUrl = resolveSafeBaseUrl(req, fallbackPort);
      const unlockState = applyVerifiedStripeUnlock(stripeSession, baseUrl);
      if (!unlockState) {
        return res.status(500).json({
          code: 'UNLOCK_ERROR',
          error: 'Płatność została potwierdzona, ale nie udało się zaktualizować stanu raportu.',
        });
      }

      await ensureUnlockedModulesEnriched(sessionId);
      const stored = sessionStore.get(sessionId);

      // Warm instance: automatically email the complete unlocked report (+ .ics attachment)
      if (stored?.report && !autoSentEmailSessions.has(stripeSession.id)) {
        await deliverPaidReportEmail({
          stripeSession,
          report: stored.report,
          unlockState: stored.unlockState,
          baseUrl,
        });
      }

      const finalUnlock = stored?.unlockState ?? unlockState;

      return res.json({
        ok: true,
        verified: true,
        paymentStatus: 'paid',
        unlockState: finalUnlock,
        report: stored?.report ?? null,
        emailConfigured: isResendConfigured(process.env.RESEND_API_KEY),
        emailDeliveredTo: finalUnlock.emailDeliveredTo ?? null,
      });
    } catch (err) {
      console.error('[GET /api/checkout/verify]', err);
      return res.status(502).json({
        code: 'STRIPE_NETWORK_ERROR',
        error: 'Nie udało się połączyć ze Stripe w celu potwierdzenia płatności. Odśwież stronę za chwilę.',
      });
    }
  });

  // Stateless post-payment OpenAI enrichment (works even after a Vercel serverless cold start)
  app.post('/api/report/enrich-paid', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`enrich:${ip}`, 20, 15 * 60 * 1000)) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        error: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.',
      });
    }

    const stripeSecretKey = normalizeStripeEnvValue(process.env.STRIPE_SECRET_KEY);
    if (getStripeRuntimeMode(stripeSecretKey) === 'unconfigured') {
      return res.status(503).json({ code: 'STRIPE_NOT_CONFIGURED', error: 'Stripe nie jest skonfigurowany.' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : '';
    const stripeSessionId =
      typeof body.stripeSessionId === 'string' ? body.stripeSessionId.trim().slice(0, 128) : '';
    const clientReport = body.report as SolarisFullReport | undefined;

    if (
      !sessionId ||
      !isValidStripeCheckoutSessionId(stripeSessionId) ||
      !clientReport ||
      clientReport.sessionId !== sessionId ||
      !clientReport.modules
    ) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Nieprawidłowe dane raportu.' });
    }

    try {
      const lookup = await retrieveStripeCheckoutSession(stripeSessionId, stripeSecretKey);
      if (
        !lookup.ok ||
        lookup.session.payment_status !== 'paid' ||
        lookup.session.metadata?.sessionId !== sessionId
      ) {
        return res.status(403).json({
          code: 'PAYMENT_NOT_VERIFIED',
          error: 'Płatność dla tego raportu nie została potwierdzona.',
        });
      }

      const paidModules = parseModulesFromMetadata(lookup.session.metadata?.modules);
      if (paidModules.length === 0) {
        return res.json({ ok: true, report: clientReport });
      }

      const enriched = await enrichUnlockedModulesWithOpenAI(
        clientReport,
        paidModules,
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL,
      );

      return res.json({ ok: true, report: enriched });
    } catch (err) {
      console.error('[POST /api/report/enrich-paid]', err);
      return res.json({ ok: true, report: clientReport });
    }
  });

  // Stateless Stripe-verified full report email delivery (works on Vercel cold starts + manual resend)
  app.post('/api/report/deliver-email', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`deliver-email:${ip}`, 8, 15 * 60 * 1000)) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        error: 'Zbyt wiele prób wysyłki e-mail. Odczekaj kilka minut i spróbuj ponownie.',
      });
    }

    const stripeSecretKey = normalizeStripeEnvValue(process.env.STRIPE_SECRET_KEY);
    if (getStripeRuntimeMode(stripeSecretKey) === 'unconfigured') {
      return res.status(503).json({
        code: 'STRIPE_NOT_CONFIGURED',
        error: 'Płatności Stripe nie są skonfigurowane na serwerze.',
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : '';
    const stripeSessionId =
      typeof body.stripeSessionId === 'string' ? body.stripeSessionId.trim().slice(0, 128) : '';
    const recipientEmail =
      typeof body.recipientEmail === 'string' ? body.recipientEmail.trim().slice(0, 120) : '';
    const forceResend = body.forceResend === true;
    const clientReport = body.report as SolarisFullReport | undefined;

    if (!sessionId || !isValidStripeCheckoutSessionId(stripeSessionId)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: 'Brak prawidłowego identyfikatora zamówienia do wysyłki raportu.',
      });
    }

    if (recipientEmail && !isValidEmailAddress(recipientEmail)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: 'Wpisz poprawny adres e-mail odbiorcy.',
      });
    }

    try {
      const lookup = await retrieveStripeCheckoutSession(stripeSessionId, stripeSecretKey);
      if (
        !lookup.ok ||
        lookup.session.payment_status !== 'paid' ||
        lookup.session.metadata?.sessionId !== sessionId
      ) {
        return res.status(403).json({
          code: 'PAYMENT_NOT_VERIFIED',
          error: 'Płatność dla tego raportu nie została potwierdzona w Stripe.',
        });
      }

      const baseUrl = resolveSafeBaseUrl(req, fallbackPort);
      const unlockState = applyVerifiedStripeUnlock(lookup.session, baseUrl);
      if (!unlockState) {
        return res.status(500).json({
          code: 'UNLOCK_ERROR',
          error: 'Nie udało się odczytać zakresu opłaconego raportu.',
        });
      }

      const stored = sessionStore.get(sessionId);
      let activeReport: SolarisFullReport | null = stored?.report ?? null;

      if (activeReport) {
        await ensureUnlockedModulesEnriched(sessionId);
        activeReport = sessionStore.get(sessionId)?.report ?? activeReport;
      } else if (
        clientReport &&
        clientReport.sessionId === sessionId &&
        clientReport.modules &&
        clientReport.person1?.name
      ) {
        // Cold start: enrich paid modules first before sending email so inbox matches editorial quality
        const paidModules = unlockState.unlockedModules;
        activeReport =
          paidModules.length > 0 && !forceResend
            ? await enrichUnlockedModulesWithOpenAI(
                clientReport,
                paidModules,
                process.env.OPENAI_API_KEY,
                process.env.OPENAI_MODEL,
              )
            : clientReport;
      }

      if (!activeReport) {
        return res.status(404).json({
          code: 'REPORT_NOT_FOUND',
          error: 'Nie znaleziono treści raportu do wysyłki. Odśwież stronę raportu.',
        });
      }

      const delivery = await deliverPaidReportEmail({
        stripeSession: lookup.session,
        report: activeReport,
        unlockState,
        baseUrl,
        overrideRecipient: recipientEmail || undefined,
        forceResend,
      });

      if (delivery.reason === 'limit_reached') {
        return res.status(429).json({
          code: 'EMAIL_LIMIT_REACHED',
          error: delivery.error,
          report: activeReport,
          unlockState,
        });
      }

      return res.json({
        ok: true,
        sent: delivery.sent,
        alreadySent: delivery.alreadySent ?? false,
        reason: delivery.reason,
        deliveredTo: delivery.deliveredTo ?? unlockState.emailDeliveredTo ?? null,
        customerEmail: unlockState.customerEmail ?? null,
        error: delivery.error,
        report: activeReport,
        unlockState,
      });
    } catch (err) {
      console.error('[POST /api/report/deliver-email]', err);
      return res.status(502).json({
        code: 'EMAIL_DELIVERY_ERROR',
        error: 'Chwilowy problem z wysyłką e-maila. Spróbuj ponownie za minutę lub pobierz PDF A4.',
      });
    }
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
        trigger:
          String(rawQuiz.trigger ?? '').slice(0, 140) ||
          'Brak konkretu i zmienianie zdania w ostatniej chwili',
      };

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

      sessionStore.set(sessionId, {
        report,
        unlockState: initialUnlock,
        aiEnrichedModules: new Set<ReportModuleId>(),
      });

      return res.json({ report, unlockState: initialUnlock });
    } catch (err) {
      console.error('[POST /api/report/teaser]', err);
      return res.status(500).json({
        code: 'CALC_ERROR',
        error: LEGAL_TEXTS.serverCalcError,
      });
    }
  });

  const handleCreateCheckoutSession = async (req: Request, res: Response) => {
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
        error:
          'Zaznacz potwierdzenie ukończenia 18 lat oraz akceptację Regulaminu i Polityki prywatności.',
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

    const rawCustomerEmail =
      typeof body.customerEmail === 'string' ? body.customerEmail.trim().slice(0, 120) : '';
    if (rawCustomerEmail && !isValidEmailAddress(rawCustomerEmail)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: 'Wpisz poprawny adres e-mail do wysyłki raportu (albo zostaw pole puste i wpisz go w Stripe).',
      });
    }

    const stripeSecretKey = normalizeStripeEnvValue(process.env.STRIPE_SECRET_KEY);
    const secretKeyStatus = diagnoseStripeSecretKey(stripeSecretKey);
    const stripeMode = getStripeRuntimeMode(stripeSecretKey);
    if (stripeMode === 'unconfigured') {
      console.error(`[Stripe config] Cannot create Checkout Session: secretKeyStatus=${secretKeyStatus}`);
      return res.status(503).json({
        code: 'STRIPE_NOT_CONFIGURED',
        error:
          `Płatności online są chwilowo niedostępne. Spróbuj ponownie za chwilę lub napisz na ${SELLER_LEGAL_CONFIG.contactEmail}.`,
      });
    }

    const stored = sessionStore.get(sessionId);
    const personName =
      stored?.report.person1.name ||
      (typeof body.personName === 'string' && body.personName.trim()
        ? body.personName.trim().slice(0, 60)
        : 'Kliencie');

    // Server-side price calculation (never trusts client amounts; verifies 15-min upsell window statelessly via Stripe API if cold)
    const isRequestedUpsell = body.isUpsell === true;
    let isEligibleUpsell =
      isRequestedUpsell &&
      Boolean(stored?.unlockState.paid) &&
      typeof stored?.unlockState.firstPurchaseAtMs === 'number' &&
      Date.now() - stored.unlockState.firstPurchaseAtMs <= 20 * 60 * 1000;

    if (isRequestedUpsell && !isEligibleUpsell) {
      const prevStripeId =
        typeof body.previousStripeSessionId === 'string'
          ? body.previousStripeSessionId.trim().slice(0, 128)
          : '';
      if (sessionId && isValidStripeCheckoutSessionId(prevStripeId)) {
        try {
          const prevLookup = await retrieveStripeCheckoutSession(prevStripeId, stripeSecretKey);
          if (
            prevLookup.ok &&
            prevLookup.session.payment_status === 'paid' &&
            prevLookup.session.metadata?.sessionId === sessionId
          ) {
            const createdMs =
              typeof prevLookup.session.created === 'number'
                ? prevLookup.session.created * 1000
                : Date.now();
            if (Date.now() - createdMs <= 20 * 60 * 1000) {
              isEligibleUpsell = true;
            }
          }
        } catch {
          // fall back to standard pricing if Stripe lookup fails
        }
      }
    }

    let amountGrosze: number;
    let formattedPricePln: string;
    let finalModules: ReportModuleId[];
    let calendarIncluded: boolean;
    let pdfIncluded: boolean;
    let productName: string;
    let productDescription: string;

    if (isEligibleUpsell) {
      amountGrosze = POST_PURCHASE_UPSELL_GROSZE;
      formattedPricePln = formatPlnFromGrosze(POST_PURCHASE_UPSELL_GROSZE);
      finalModules = getAvailableModulesForMode(mode).map((m) => m.id);
      calendarIncluded = true;
      pdfIncluded = true;
      productName =
        mode === 'pair'
          ? 'Solaris 2027 — Rozszerzenie do Pełnego Pakietu dla Dwojga'
          : 'Solaris 2027 — Rozszerzenie do Pełnego Pakietu Solo';
      productDescription =
        'Odblokowanie wszystkich pozostałych modułów raportu 2027 + eksport PDF A4 i kalendarz .ics.';
    } else {
      const pricing = calculateModularPricing({
        mode,
        selectedModules,
        includeCalendarBump: Boolean(body.includeCalendarBump),
        hasRetentionDiscount: Boolean(body.hasRetentionDiscount),
        useDownsellOffer: Boolean(body.useDownsellOffer),
      });
      amountGrosze = pricing.finalPriceGrosze;
      formattedPricePln = pricing.formattedFinalPln;
      finalModules = selectedModules;
      calendarIncluded =
        pricing.includesFreeCalendarAndPdf ||
        Boolean(body.includeCalendarBump) ||
        Boolean(body.useDownsellOffer);
      pdfIncluded = pricing.includesFreeCalendarAndPdf;
      productName = pricing.isFullBundle
        ? mode === 'pair'
          ? 'Solaris 2027 — Pełny Pakiet dla Dwojga (5 modułów + PDF + .ics)'
          : 'Solaris 2027 — Pełny Pakiet Solo (4 moduły + PDF + .ics)'
        : `Solaris 2027 — Wybrane moduły (${finalModules.length})${calendarIncluded ? ' + Kalendarz .ics' : ''}`;
      productDescription = `Spersonalizowany raport Solariusza 2027 (${mode === 'pair' ? 'Dla dwojga' : 'Solo'}). Jednorazowa płatność, bez subskrypcji.`;
    }

    const orderId = `SOL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const baseUrl = resolveSafeBaseUrl(req, fallbackPort);
    const effectiveSessionId = sessionId || orderId;

    const consentsAcceptedAt = new Date().toISOString();

    try {
      const stripeRes = await createStripeCheckoutSession({
        secretKey: stripeSecretKey,
        amountGrosze,
        productName,
        productDescription,
        successUrl: `${baseUrl}/?raport=${encodeURIComponent(effectiveSessionId)}&checkout=success&stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/?raport=${encodeURIComponent(effectiveSessionId)}&checkout=cancelled`,
        customerEmail: rawCustomerEmail || undefined,
        metadata: {
          sessionId: effectiveSessionId,
          orderId,
          mode,
          personName,
          modules: finalModules.join(','),
          calendar: calendarIncluded ? 'true' : 'false',
          pdf: pdfIncluded ? 'true' : 'false',
          priceGrossPln: formattedPricePln,
          isUpsell: isEligibleUpsell ? 'true' : 'false',
          regulaminVersion: SELLER_LEGAL_CONFIG.regulaminVersion,
          consentsAcceptedAt,
          marketingConsent: marketingConsent ? 'true' : 'false',
        },
        idempotencyKey: orderId,
      });

      if (!stripeRes.ok) {
        console.error('[Stripe Checkout error]:', stripeRes.error);
        return res
          .status(stripeRes.status >= 400 && stripeRes.status < 600 ? stripeRes.status : 502)
          .json({
            code: 'STRIPE_CHECKOUT_ERROR',
            error: `${LEGAL_TEXTS.paymentFailedError} (${stripeRes.error})`,
          });
      }

      consentAuditLog.push({
        timestamp: new Date().toISOString(),
        sessionId: effectiveSessionId,
        orderId,
        stripeSessionId: stripeRes.session.id,
        status: 'checkout_created',
        regulaminVersion: SELLER_LEGAL_CONFIG.regulaminVersion,
        ipHash: hashIp(ip),
        termsAndAgeAccepted,
        withdrawalWaiverAccepted,
        secondPersonConsentAccepted: mode === 'pair' ? secondPersonConsentAccepted : null,
        marketingConsent,
      });

      return res.json({
        ok: true,
        requiresRedirect: true,
        checkoutUrl: stripeRes.session.url,
        stripeSessionId: stripeRes.session.id,
        stripeMode,
        orderId,
        amountPln: formattedPricePln,
      });
    } catch (err) {
      console.error('[POST /api/report/unlock]', err);
      return res.status(502).json({
        code: 'STRIPE_NETWORK_ERROR',
        error: LEGAL_TEXTS.paymentFailedError,
      });
    }
  };

  app.post('/api/report/unlock', handleCreateCheckoutSession);
  app.post('/api/checkout/create-session', handleCreateCheckoutSession);

  app.post('/api/followup/save', async (req, res) => {
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

    let emailSent = false;
    if (isResendConfigured(process.env.RESEND_API_KEY)) {
      const baseUrl = resolveSafeBaseUrl(req, fallbackPort);
      const stored = sessionId && sessionId !== 'guest' && sessionId !== 'landing-visitor'
        ? sessionStore.get(sessionId)
        : undefined;
      const personName =
        stored?.report.person1.name ||
        (typeof body.personName === 'string' ? body.personName.trim().slice(0, 60) : '');
      const peakMonthPl =
        stored?.report.peakMonthPl ||
        (typeof body.peakMonthPl === 'string' ? body.peakMonthPl.trim().slice(0, 40) : '');
      const riskMonthPl =
        stored?.report.riskMonthPl ||
        (typeof body.riskMonthPl === 'string' ? body.riskMonthPl.trim().slice(0, 40) : '');
      const reportUrl =
        sessionId && sessionId !== 'guest' && sessionId !== 'landing-visitor'
          ? `${baseUrl}/?raport=${encodeURIComponent(sessionId)}`
          : baseUrl;

      const reminderPayload = buildFollowUpReminderEmailPayload({
        baseUrl,
        personName: personName || undefined,
        peakMonthPl: peakMonthPl || undefined,
        riskMonthPl: riskMonthPl || undefined,
        reportUrl,
      });
      const sent = await sendEmailViaResend({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM,
        to: email,
        payload: reminderPayload,
      });
      emailSent = sent.ok;
    }

    return res.json({
      ok: true,
      emailSent,
      message: emailSent
        ? 'Wysłaliśmy rabat -20% na Twój e-mail oraz aktywowaliśmy zniżkę na tej stronie. Zgodę możesz wycofać w każdej chwili.'
        : 'Zapisaliśmy Twój adres oraz rabat -20% na pełny pakiet. Zgodę możesz wycofać w każdej chwili.',
    });
  });

  return app;
}
