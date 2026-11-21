import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateModulePricePln,
  calculateSolarMatrix2027,
  formatBirthDateInput,
  parsePolishBirthDate,
} from './solarisMatrix';

test('parsePolishBirthDate handles valid DD.MM.YYYY and ISO formats', () => {
  const dmy = parsePolishBirthDate('15.05.1996');
  assert.equal(dmy.ok, true);
  if (dmy.ok) {
    assert.equal(dmy.value.formatted, '15.05.1996');
    assert.equal(dmy.value.day, 15);
    assert.equal(dmy.value.month, 5);
    assert.equal(dmy.value.year, 1996);
  }

  const iso = parsePolishBirthDate('1994-11-14');
  assert.equal(iso.ok, true);
  if (iso.ok) {
    assert.equal(iso.value.formatted, '14.11.1994');
  }
});

test('parsePolishBirthDate rejects empty, impossible calendar dates, and invalid years', () => {
  assert.equal(parsePolishBirthDate('').ok, false);
  assert.equal(parsePolishBirthDate('31.02.1995').ok, false);
  assert.equal(parsePolishBirthDate('29.02.2023').ok, false);
  assert.equal(parsePolishBirthDate('29.02.2024').ok, true);
  assert.equal(parsePolishBirthDate('15.05.2030').ok, false);
  assert.equal(parsePolishBirthDate('15.05.1910').ok, false);
});

test('calculateSolarMatrix2027 produces solo matrix and 68%-94% partner compatibility', () => {
  const solo = calculateSolarMatrix2027('15.05.1996');
  assert.equal(solo.ok, true);
  if (solo.ok) {
    assert.equal(solo.data.signNamePl, 'Byk');
    assert.equal(solo.data.energySeries.length, 12);
    assert.equal(solo.data.riskSeries.length, 12);
    assert.equal(solo.data.primaryMetricLabel, 'Indeks 2027');
    assert.equal(solo.data.partnerDateFormatted, null);
  }

  const pair = calculateSolarMatrix2027('15.05.1996', '22.11.1994');
  assert.equal(pair.ok, true);
  if (pair.ok) {
    assert.equal(pair.data.primaryMetricLabel, 'Zgodność');
    assert.equal(pair.data.partnerDateFormatted, '22.11.1994');
    const score = Number.parseInt(pair.data.primaryMetricValue, 10);
    assert.ok(score >= 68 && score <= 94, `Expected score 68..94, got ${score}`);
  }

  const badPartner = calculateSolarMatrix2027('15.05.1996', '31.02.1994');
  assert.equal(badPartner.ok, false);
  if (!badPartner.ok) {
    assert.equal(badPartner.field, 'partner');
  }
});

test('calculateModulePricePln matches exact Polish PLN tier pricing', () => {
  assert.equal(calculateModulePricePln(1), '14,99 zł');
  assert.equal(calculateModulePricePln(2), '24,99 zł');
  assert.equal(calculateModulePricePln(3), '32,99 zł');
  assert.equal(calculateModulePricePln(4), '39,99 zł');
  assert.equal(calculateModulePricePln(5), '44,99 zł');
});

test('formatBirthDateInput formats digits cleanly', () => {
  assert.equal(formatBirthDateInput('15051996'), '15.05.1996');
  assert.equal(formatBirthDateInput('1505'), '15.05');
});
