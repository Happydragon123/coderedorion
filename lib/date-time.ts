export type DateTimeSelection = { date: string; hour: string; minute: string; period: string };
export const EMPTY_DATE_TIME: DateTimeSelection = { date: '', hour: '', minute: '', period: '' };
const chicago = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function parts(date: Date) {
  return Object.fromEntries(chicago.formatToParts(date).map(part => [part.type, part.value]));
}
export function chicagoToday(): string {
  const p = parts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}
export function dateTimeToIso(selection: DateTimeSelection): string | undefined {
  const { date, hour, minute, period } = selection;
  if ([date, hour, minute, period].every(value => value === '')) return undefined;
  if (![date, hour, minute, period].every(Boolean)) throw new Error('Choose a date, hour, minute and AM or PM.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[1-9]|1[0-2])$/.test(hour) || !/^[0-5]\d$/.test(minute) || !['AM', 'PM'].includes(period)) {
    throw new Error('Choose a valid date and time.');
  }
  const [year, month, day] = date.split('-').map(Number);
  if (year < 1000 || year > 9999) throw new Error('Choose a valid calendar date.');
  const hour24 = Number(hour) % 12 + (period === 'PM' ? 12 : 0);
  const local = Date.UTC(year, month - 1, day, hour24, Number(minute));
  const calendar = new Date(local);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error('Choose a valid calendar date.');
  const matches = [5, 6].map(offset => new Date(local + offset * 3600000)).filter(candidate => {
    const p = parts(candidate);
    return `${p.year}-${p.month}-${p.day}` === date && Number(p.hour) === hour24 && Number(p.minute) === Number(minute);
  });
  if (matches.length === 0) throw new Error('That time does not exist in America/Chicago because the clocks change. Choose another time.');
  if (matches.length > 1) throw new Error('That time occurs twice in America/Chicago because the clocks change. Choose another time.');
  return matches[0].toISOString();
}
