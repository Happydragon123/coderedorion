import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chicagoToday, dateTimeToIso, EMPTY_DATE_TIME, type DateTimeSelection } from '../lib/date-time';
const selection = (date: string, hour = '1', minute = '30', period = 'PM'): DateTimeSelection => ({ date, hour, minute, period });
test('Chicago calendar controls convert summer/winter and noon/midnight independently of host zone', () => {
  assert.equal(dateTimeToIso(selection('2026-07-10')), '2026-07-10T18:30:00.000Z');
  assert.equal(dateTimeToIso(selection('2026-01-10')), '2026-01-10T19:30:00.000Z');
  assert.equal(dateTimeToIso(selection('2026-07-10', '12', '00', 'AM')), '2026-07-10T05:00:00.000Z');
  assert.equal(dateTimeToIso(selection('2026-07-10', '12', '00', 'PM')), '2026-07-10T17:00:00.000Z');
  assert.match(chicagoToday(), /^\d{4}-\d{2}-\d{2}$/);
});
test('empty selection clears while incomplete and invalid calendar/time selections fail', () => {
  assert.equal(dateTimeToIso(EMPTY_DATE_TIME), undefined);
  assert.throws(() => dateTimeToIso({ ...EMPTY_DATE_TIME, date: '2026-07-10' }), /Choose a date/);
  for (const input of [selection('2026-02-30'), selection('2026-02-29'), selection('2026-13-01'), selection('2026-07-10', '13'), selection('2026-07-10', '1', '60'), selection('2026-07-10', '1', '00', 'am')]) assert.throws(() => dateTimeToIso(input));
  assert.equal(dateTimeToIso(selection('2028-02-29')), '2028-02-29T19:30:00.000Z');
});
test('Chicago DST skipped and duplicated times require another unambiguous selection', () => {
  assert.throws(() => dateTimeToIso(selection('2026-03-08', '2', '30', 'AM')), /does not exist/);
  assert.throws(() => dateTimeToIso(selection('2026-11-01', '1', '30', 'AM')), /occurs twice/);
  assert.equal(dateTimeToIso(selection('2026-03-08', '3', '00', 'AM')), '2026-03-08T08:00:00.000Z');
  assert.equal(dateTimeToIso(selection('2026-11-01', '2', '00', 'AM')), '2026-11-01T08:00:00.000Z');
});
