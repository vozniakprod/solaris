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
  assert.ok(
    report.compatibilityScore !== null &&
      report.compatibilityScore >= 68 &&
      report.compatibilityScore <= 94,
  );
  assert.equal(report.ephemeris.natalSunSignPl, 'Byk');
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

test('city search handles Polish diacritics and birth-time/email validation works', () => {
  const lodz = searchCities('lodz');
  assert.equal(lodz[0]?.name, 'Łódź');
  assert.equal(validateBirthTime('', true).ok, true);
  assert.equal(validateBirthTime('25:99', false).ok, false);
  assert.equal(validateBirthTime('14:30', false).ok, true);
  assert.equal(isValidEmailAddress('kasia@example.pl'), true);
  assert.equal(isValidEmailAddress('bad-email'), false);
});
