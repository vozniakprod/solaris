import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDeterministicSolarisReport,
  computeExactSolarReturn2027,
} from './ephemerisEngine';
import {
  calculateModularPricing,
  isValidEmailAddress,
  validateBirthTime,
} from './solarisPricing';
import { buildSolaris2027Ics } from './icsExport';
import { searchCities } from '../data/polishEuCities';

test('computeExactSolarReturn2027 finds exact 2027 Solar Return within +/- 2 days of birthday', () => {
  const natal = new Date(Date.UTC(1996, 4, 15, 11, 30)); // 15 May 1996
  const res = computeExactSolarReturn2027(natal);
  assert.equal(res.solarReturnDate.getUTCFullYear(), 2027);
  assert.equal(res.solarReturnDate.getUTCMonth(), 4); // May
  assert.ok(
    res.solarReturnDate.getUTCDate() >= 14 && res.solarReturnDate.getUTCDate() <= 16,
    `Expected May 14..16, got ${res.solarReturnDate.toISOString()}`,
  );
  // Taurus is 30..60 deg
  assert.ok(res.natalSunLon >= 50 && res.natalSunLon <= 58);
});

test('computeDeterministicSolarisReport generates solo and pair (68%-94%) reports with 12 months and 12 calendar events', () => {
  const report = computeDeterministicSolarisReport({
    sessionId: 'test-session-1',
    mode: 'pair',
    relationType: 'para',
    person1: {
      name: 'Kasia',
      birthDate: '15.05.1996',
      birthTime: '14:30',
      timeUnknown: false,
      city: 'Warszawa',
    },
    person2: {
      name: 'Marek',
      birthDate: '22.11.1994',
      birthTime: '12:00',
      timeUnknown: true,
      city: 'Kraków',
    },
    quizAnswers: {
      money: 'Chcę zwiększyć dochód i podnieść stawki',
      crisis: 'Tnę straty od razu i szukam planu B',
      priority: 'Stagnacja w pracy lub zarobkach',
      rhythm: 'Szybkie sprinty i twarde deadliny',
      trigger: 'Brak konkretu i zmienianie zdania w ostatniej chwili',
    },
  });

  assert.equal(report.monthlyTimeline.length, 12);
  assert.equal(report.calendarEvents.length, 12);
  assert.equal(report.quarterlyBars.length, 5);
  assert.equal(report.quarterlyBars.filter((q) => q.isPeak).length, 1);
  assert.equal(report.sphereScores.length, 4);
  assert.equal(report.planetarySignals.length, 4);
  assert.ok(report.featuredAlerts.length >= 2);
  assert.ok(
    report.compatibilityScore !== null &&
      report.compatibilityScore >= 68 &&
      report.compatibilityScore <= 94,
  );
  assert.ok(report.compatibilityBreakdown !== null);
  assert.ok(report.compatibilityBreakdown.decisionsAndFinance >= 66);
  assert.ok(report.compatibilityBreakdown.stressCommunication >= 62);
  assert.ok(report.compatibilityBreakdown.sharedRhythm2027 >= 68);
  assert.equal(report.ephemeris.natalSunSignPl, 'Byk');
  assert.ok(report.modules.finanse.deepDive.length > 40);
  assert.equal(report.modules.finanse.avoidList.length, 2);
  assert.ok(report.modules.finanse.checkpoint.length > 20);
  // Proper Polish locative case (e.g. "w styczniu 2027", never nominative "w styczeń 2027")
  assert.ok(!/w (styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień) 2027/i.test(report.freeCoreVectorTitle));
});

test('calculateModularPricing enforces exact PLN tiers, full bundle freebies, order bump, and downsell', () => {
  const solo1 = calculateModularPricing({
    mode: 'solo',
    selectedModules: ['finanse'],
    includeCalendarBump: false,
  });
  assert.equal(solo1.formattedFinalPln, '14,99 zł');
  assert.equal(solo1.includesFreeCalendarAndPdf, false);

  const solo1WithBump = calculateModularPricing({
    mode: 'solo',
    selectedModules: ['finanse'],
    includeCalendarBump: true,
  });
  assert.equal(solo1WithBump.formattedFinalPln, '24,98 zł');

  const pair4 = calculateModularPricing({
    mode: 'pair',
    selectedModules: ['finanse', 'relacje', 'energia', 'zmiany'],
    includeCalendarBump: false,
  });
  assert.equal(pair4.formattedFinalPln, '39,99 zł');
  assert.equal(pair4.isFullBundle, false);

  const pairFull = calculateModularPricing({
    mode: 'pair',
    selectedModules: ['finanse', 'relacje', 'energia', 'zmiany', 'zgodnosc'],
    includeCalendarBump: true, // should be FREE on full bundle
  });
  assert.equal(pairFull.isFullBundle, true);
  assert.equal(pairFull.includesFreeCalendarAndPdf, true);
  assert.equal(pairFull.formattedFinalPln, '44,99 zł');

  const downsell = calculateModularPricing({
    mode: 'solo',
    selectedModules: ['finanse'],
    includeCalendarBump: false,
    useDownsellOffer: true,
  });
  assert.equal(downsell.formattedFinalPln, '9,99 zł');
});

test('buildSolaris2027Ics produces valid RFC 5545 VCALENDAR and sanitizes special characters', () => {
  const ics = buildSolaris2027Ics('Kasia;\nINJECT', [
    {
      id: 'ev-1',
      dateStart: '2027-05-14',
      dateEnd: '2027-05-18',
      type: 'golden',
      title: 'Okno finansowe, test; ważny',
      summary: 'Negocjacje\nbez pośpiechu',
      moduleId: 'finanse',
    },
  ]);

  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('X-WR-CALNAME:Solaris 2027 — Kasia\\;\\nINJECT'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20270514'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20270519'));
});

test('city search handles Polish diacritics, multilingual altNames, and birth-time/email validation', () => {
  const lodz = searchCities('lodz');
  assert.equal(lodz[0]?.name, 'Łódź');
  assert.equal(lodz[0]?.tz, 'Europe/Warsaw');

  const warsawEn = searchCities('Warsaw');
  assert.equal(warsawEn[0]?.name, 'Warszawa');

  const warsawRu = searchCities('Варшава');
  assert.equal(warsawRu[0]?.name, 'Warszawa');

  const cracow = searchCities('Cracow');
  assert.equal(cracow[0]?.name, 'Kraków');

  const nyc = searchCities('New York');
  assert.equal(nyc[0]?.tz, 'America/New_York');

  assert.equal(validateBirthTime('', true).ok, true);
  assert.equal(validateBirthTime('25:99', false).ok, false);
  assert.equal(validateBirthTime('14:30', false).ok, true);
  assert.equal(isValidEmailAddress('kasia@example.pl'), true);
  assert.equal(isValidEmailAddress('bad-email'), false);
});

test('localDateTimeToUtc respects historical Polish CET/CEST DST transitions and unknown birth time uses 12:00 local time', async () => {
  const { localDateTimeToUtc } = await import('./ephemerisEngine');

  // 15 May 1996 in Warsaw was CEST (UTC+2) -> 14:30 local = 12:30 UTC
  const summerWarsaw = localDateTimeToUtc(1996, 5, 15, 14, 30, 'Europe/Warsaw');
  assert.equal(summerWarsaw.getUTCHours(), 12);
  assert.equal(summerWarsaw.getUTCMinutes(), 30);

  // 15 Jan 1996 in Warsaw was CET (UTC+1) -> 14:30 local = 13:30 UTC
  const winterWarsaw = localDateTimeToUtc(1996, 1, 15, 14, 30, 'Europe/Warsaw');
  assert.equal(winterWarsaw.getUTCHours(), 13);
  assert.equal(winterWarsaw.getUTCMinutes(), 30);

  // Unknown birth time sets omittedTimeDependentElements and honest note
  const report = computeDeterministicSolarisReport({
    sessionId: 'unknown-time-test',
    mode: 'solo',
    relationType: null,
    person1: {
      name: 'Anna',
      birthDate: '15.05.1996',
      birthTime: '',
      timeUnknown: true,
      city: 'Warszawa',
    },
    person2: null,
    quizAnswers: {
      money: 'Chcę zwiększyć dochód i podnieść stawki',
      crisis: 'Tnę straty od razu i szukam planu B',
      priority: 'Stagnacja w pracy lub zarobkach',
      rhythm: 'Szybkie sprinty i twarde deadliny',
      trigger: 'Brak konkretu i zmienianie zdania w ostatniej chwili',
    },
  });

  assert.equal(report.ephemeris.omittedTimeDependentElements, true);
  assert.equal(
    report.ephemeris.unknownTimeNotePl,
    'Bez godziny urodzenia pominęliśmy elementy zależne od godziny.',
  );
  assert.ok(report.ephemeris.timeUsedUtc.includes('12:00 czasu lokalnego'));
});

test('durable order confirmation and static HTML legal documents include required Polish consumer notices', async () => {
  const {
    buildDurableOrderConfirmation,
    LEGAL_DOCUMENTS,
    renderStaticLegalHtml,
  } = await import('../data/legalDocuments');

  const conf = buildDurableOrderConfirmation({
    orderId: 'SOL-TEST1234',
    personName: 'Anna',
    mode: 'pair',
    priceGrossPln: '24,99 zł',
    sessionId: '00000000-0000-4000-8000-000000000001',
    baseUrl: 'https://solaris2027.pl',
  });

  assert.ok(conf.subject.includes('SOL-TEST1234'));
  assert.ok(conf.plainTextBody.includes('art. 38 ustawy o prawach konsumenta'));
  assert.ok(conf.plainTextBody.includes('dla dwojga'));
  assert.ok(conf.plainTextBody.includes('https://solaris2027.pl/regulamin'));

  const html = renderStaticLegalHtml(LEGAL_DOCUMENTS.regulamin);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<html lang="pl">'));
  assert.ok(html.includes('§6. Odstąpienie od umowy'));
  assert.ok(html.includes('GeoNames.org'));
  assert.ok(html.includes('https://solaris27.pl'));
  assert.ok(html.includes('kontakt@solaris27.pl'));
  for (const doc of Object.values(LEGAL_DOCUMENTS)) {
    const rendered = renderStaticLegalHtml(doc);
    assert.ok(!rendered.includes('[['), `Found unreplaced placeholder in ${doc.id}`);
  }
});

test('Stripe server helpers validate keys, session IDs, Checkout params, and HMAC webhook signatures', async () => {
  const crypto = await import('node:crypto');
  const {
    buildStripeCheckoutFormParams,
    getStripeRuntimeMode,
    isValidStripeCheckoutSessionId,
    parseModulesFromMetadata,
    verifyStripeWebhookSignature,
  } = await import('./stripeServer');

  assert.equal(getStripeRuntimeMode(''), 'unconfigured');
  assert.equal(getStripeRuntimeMode('sk_test_123456'), 'test');
  assert.equal(getStripeRuntimeMode('sk_live_123456'), 'live');

  assert.equal(isValidStripeCheckoutSessionId('cs_test_a1B2c3D4e5F6g7H8'), true);
  assert.equal(isValidStripeCheckoutSessionId('../customers'), false);
  assert.equal(isValidStripeCheckoutSessionId('invalid_id'), false);

  const params = buildStripeCheckoutFormParams({
    secretKey: 'sk_test_dummy',
    amountGrosze: 2499,
    productName: 'Solaris 2027 — Wybrane moduły (2)',
    productDescription: 'Jednorazowa płatność',
    successUrl: 'https://solaris2027.pl/?raport=abc&checkout=success&stripe_session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://solaris2027.pl/?raport=abc&checkout=cancelled',
    metadata: {
      sessionId: 'abc',
      orderId: 'SOL-1234',
      mode: 'pair',
      personName: 'Anna',
      modules: 'zgodnosc,finanse',
      calendar: 'false',
      pdf: 'false',
      priceGrossPln: '24,99 zł',
      isUpsell: 'false',
    },
  });
  assert.equal(params.get('mode'), 'payment');
  assert.equal(params.get('locale'), 'pl');
  assert.equal(params.get('line_items[0][price_data][currency]'), 'pln');
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '2499');
  assert.equal(params.get('metadata[modules]'), 'zgodnosc,finanse');
  assert.deepEqual(parseModulesFromMetadata('zgodnosc,finanse,invalid'), ['zgodnosc', 'finanse']);

  // HMAC webhook signature verification (valid, key rotation, tampered, expired)
  const secret = 'whsec_test_secret_123';
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const now = 1700000000;
  const sigHex = crypto.createHmac('sha256', secret).update(`${now}.${body}`, 'utf8').digest('hex');

  assert.equal(verifyStripeWebhookSignature(body, `t=${now},v1=${sigHex}`, secret, now + 10), true);
  // Key rotation header with two v1 entries
  assert.equal(
    verifyStripeWebhookSignature(body, `t=${now},v1=0000,v1=${sigHex}`, secret, now + 10),
    true,
  );
  // Tampered body
  assert.equal(verifyStripeWebhookSignature(body + ' ', `t=${now},v1=${sigHex}`, secret, now + 10), false);
  // Expired timestamp (> 5 min replay)
  assert.equal(verifyStripeWebhookSignature(body, `t=${now},v1=${sigHex}`, secret, now + 600), false);
});

test('OpenAI editorial engine enforces Polish safety rules, omits houses on unknown birth time, and falls back safely without key', async () => {
  const {
    buildOpenAITeaserPrompt,
    buildOpenAIUnlockedModulesPrompt,
    enrichTeaserWithOpenAI,
    isOpenAIConfigured,
    SOLARIS_EDITORIAL_SYSTEM_PROMPT,
  } = await import('./openaiEditorial');

  assert.equal(isOpenAIConfigured(''), false);
  assert.equal(isOpenAIConfigured('sk-proj-example1234567890'), true);
  assert.ok(SOLARIS_EDITORIAL_SYSTEM_PROMPT.includes('Nigdy nie udzielaj porad medycznych'));
  assert.ok(SOLARIS_EDITORIAL_SYSTEM_PROMPT.includes('ascendencie'));

  const base = computeDeterministicSolarisReport({
    sessionId: 'openai-prompt-test',
    mode: 'pair',
    relationType: 'para',
    person1: {
      name: 'Anna',
      birthDate: '15.05.1996',
      birthTime: '',
      timeUnknown: true,
      city: 'Warszawa',
    },
    person2: {
      name: 'Jan',
      birthDate: '22.11.1994',
      birthTime: '10:15',
      timeUnknown: false,
      city: 'Kraków',
    },
    quizAnswers: {
      money: 'Chcę zwiększyć dochód i podnieść stawki',
      crisis: 'Tnę straty od razu i szukam planu B',
      priority: 'Niedopowiedzenia w ważnej relacji',
      rhythm: 'Spokojny plan rozpisany na kwartały',
      trigger: 'Brak konkretu i zmienianie zdania w ostatniej chwili',
    },
  });

  const teaserPrompt = buildOpenAITeaserPrompt(base);
  assert.ok(teaserPrompt.includes('Godzina urodzenia nie została podana'));
  assert.ok(teaserPrompt.includes('Jan'));

  const modulesPrompt = buildOpenAIUnlockedModulesPrompt(base, ['finanse', 'zgodnosc']);
  assert.ok(modulesPrompt.includes('finanse'));
  assert.ok(modulesPrompt.includes('zgodnosc'));

  // Without API key, safely returns deterministic report unchanged
  const unchanged = await enrichTeaserWithOpenAI(base, '');
  assert.equal(unchanged.sessionId, base.sessionId);
  assert.equal(unchanged.freeCoreVectorTitle, base.freeCoreVectorTitle);
});

test('resolveSafeBaseUrl resolves Vercel forwarded host/proto safely and blocks host injection', async () => {
  const { resolveSafeBaseUrl } = await import('../server/createApiApp');
  const vercelApp = (await import('../server/vercelEntry')).default;
  assert.equal(typeof vercelApp, 'function');

  const prevAppUrl = process.env.APP_URL;
  delete process.env.APP_URL;

  try {
    const vercelReq = {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'solaris-snowy.vercel.app',
      },
      protocol: 'http',
    } as never;
    assert.equal(resolveSafeBaseUrl(vercelReq), 'https://solaris-snowy.vercel.app');

    const maliciousReq = {
      headers: {
        'x-forwarded-proto': 'javascript',
        'x-forwarded-host': 'evil.com/phish?x=1',
      },
      protocol: 'http',
    } as never;
    assert.equal(resolveSafeBaseUrl(maliciousReq, 3000), 'http://localhost:3000');
  } finally {
    if (prevAppUrl !== undefined) {
      process.env.APP_URL = prevAppUrl;
    }
  }
});

test('emailDelivery escapes HTML, includes only unlocked modules, attaches .ics only when unlocked, and falls back safely without key', async () => {
  const {
    buildFollowUpReminderEmailPayload,
    buildFullReportEmailPayload,
    isResendConfigured,
    maskEmailForUi,
    sendEmailViaResend,
  } = await import('./emailDelivery');
  const { buildDurableOrderConfirmation } = await import('../data/legalDocuments');

  assert.equal(isResendConfigured(''), false);
  assert.equal(isResendConfigured('invalid_key'), false);
  assert.equal(isResendConfigured('re_1234567890abcdef'), true);
  assert.equal(maskEmailForUi('kasia.nowak@gmail.com'), 'ka***@gmail.com');

  const report = computeDeterministicSolarisReport({
    sessionId: 'email-test-1',
    mode: 'solo',
    relationType: null,
    person1: {
      name: 'Kasia <script>alert(1)</script>',
      birthDate: '15.05.1996',
      birthTime: '14:30',
      timeUnknown: false,
      city: 'Warszawa',
    },
    person2: null,
    quizAnswers: {
      money: 'Chcę zwiększyć dochód i podnieść stawki',
      crisis: 'Tnę straty od razu i szukam planu B',
      priority: 'Stagnacja w pracy lub zarobkach',
      rhythm: 'Spokojny plan rozpisany na kwartały',
      trigger: 'Brak konkretu i zmienianie zdania w ostatniej chwili',
    },
  });

  const confirmation = buildDurableOrderConfirmation({
    orderId: 'SOL-MAIL01',
    personName: report.person1.name,
    mode: 'solo',
    priceGrossPln: '44,99 zł',
    sessionId: report.sessionId,
    baseUrl: 'https://solaris2027.pl',
  });

  const withCalendar = buildFullReportEmailPayload({
    report,
    unlockedModules: ['finanse'],
    calendarUnlocked: true,
    confirmation,
  });

  assert.ok(withCalendar.subject.includes('SOL-MAIL01'));
  // XSS must be HTML-escaped
  assert.ok(!withCalendar.html.includes('<script>alert(1)</script>'));
  assert.ok(withCalendar.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  // Only unlocked module ('finanse') should appear; locked module ('relacje') must NOT appear
  assert.ok(withCalendar.html.includes(report.modules.finanse.title));
  assert.ok(!withCalendar.html.includes(report.modules.relacje.title));
  // Polish legal durable confirmation must be included
  assert.ok(withCalendar.html.includes('art. 38 ustawy o prawach konsumenta'));
  // .ics attachment must be attached when calendarUnlocked === true
  assert.equal(withCalendar.attachments?.length, 1);
  assert.equal(withCalendar.attachments?.[0]?.filename, 'solaris-2027-kalendarz.ics');
  const decodedIcs = Buffer.from(withCalendar.attachments?.[0]?.content || '', 'base64').toString('utf8');
  assert.ok(decodedIcs.startsWith('BEGIN:VCALENDAR\r\n'));

  const withoutCalendar = buildFullReportEmailPayload({
    report,
    unlockedModules: ['finanse'],
    calendarUnlocked: false,
    confirmation,
  });
  assert.equal(withoutCalendar.attachments, undefined);

  const followUp = buildFollowUpReminderEmailPayload({ baseUrl: 'https://solaris2027.pl' });
  assert.ok(followUp.subject.includes('-20%'));
  assert.ok(followUp.html.includes('35,99 zł'));

  const unconfiguredRes = await sendEmailViaResend({
    apiKey: '',
    from: undefined,
    to: 'kasia@example.pl',
    payload: followUp,
  });
  assert.equal(unconfiguredRes.ok, false);
  assert.equal(unconfiguredRes.reason, 'not_configured');
});

