/**
 * Opening hours, stored in OpenStreetMap's `opening_hours` format - the text
 * millions of places already use, so imported data and hand-entered data look
 * the same: "Mo-Fr 10:00-17:00; Sa 10:00-13:00", "24/7", or seasonal ones such
 * as "Apr-Sep Mo-Su 09:00-18:00; Oct-Mar Sa 10:00-14:00".
 *
 * Only the common subset is understood: months, weekdays, public holidays (PH),
 * time ranges and "off". Anything richer parses to `null`, and the app then
 * shows the text as it is rather than guessing.
 */

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
/** A weekday, or public holidays. */
export type DayKey = Weekday | 'PH';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "HH:MM", 24-hour; an end of "24:00" means midnight. */
export interface TimeRange {
  from: string;
  to: string;
}

/** The hours of each day; a day that is missing is closed (for PH: as usual). */
export type WeekSchedule = Partial<Record<DayKey, TimeRange[]>>;

export interface OpeningPeriod {
  /** Months 1-12 this applies in; empty means all year. */
  months: number[];
  week: WeekSchedule;
}

export interface OpeningHours {
  alwaysOpen: boolean;
  periods: OpeningPeriod[];
}

const TIME = /^([01]\d|2[0-4]):([0-5]\d)$/u;

function isTime(value: string): boolean {
  const match = TIME.exec(value);
  return match !== null && (match[1] !== '24' || match[2] === '00');
}

function expandRange<T extends string>(list: readonly T[], from: T, to: T): T[] {
  const start = list.indexOf(from);
  const end = list.indexOf(to);
  if (start <= end) return list.slice(start, end + 1);
  /* Wraps round, e.g. Fr-Mo or Nov-Feb. */
  return [...list.slice(start), ...list.slice(0, end + 1)];
}

function parseList<T extends string>(text: string, list: readonly T[]): T[] | null {
  const result: T[] = [];
  for (const part of text.split(',')) {
    const [from, to, ...rest] = part.split('-');
    if (rest.length > 0 || from === undefined) return null;
    if (!(list as readonly string[]).includes(from)) return null;
    if (to === undefined) {
      result.push(from as T);
      continue;
    }
    if (!(list as readonly string[]).includes(to)) return null;
    result.push(...expandRange(list, from as T, to as T));
  }
  return result;
}

function parseDays(text: string): DayKey[] | null {
  const days: DayKey[] = [];
  for (const part of text.split(',')) {
    if (part === 'PH') {
      days.push('PH');
      continue;
    }
    const weekdays = parseList(part, WEEKDAYS);
    if (!weekdays) return null;
    days.push(...weekdays);
  }
  return days;
}

function parseTimes(text: string): TimeRange[] | null {
  const ranges: TimeRange[] = [];
  for (const part of text.split(',')) {
    const [from, to, ...rest] = part.split('-');
    if (rest.length > 0 || from === undefined || to === undefined) return null;
    if (!isTime(from) || !isTime(to)) return null;
    ranges.push({ from, to });
  }
  return ranges;
}

const sameMonths = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((month, index) => month === b[index]);

/** Reads opening hours; `null` when the text uses syntax we do not understand. */
export function parseOpeningHours(text: string): OpeningHours | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (trimmed === '24/7') return { alwaysOpen: true, periods: [] };

  const periods: OpeningPeriod[] = [];
  for (const rawRule of trimmed.split(';')) {
    const tokens = rawRule.trim().split(/\s+/u).filter(Boolean);
    if (tokens.length === 0) continue;

    let months: number[] = [];
    const firstMonths = tokens[0] ? parseList(tokens[0], MONTHS) : null;
    if (firstMonths) {
      months = [...new Set(firstMonths.map((month) => MONTHS.indexOf(month) + 1))].sort(
        (a, b) => a - b,
      );
      tokens.shift();
    }

    let days: DayKey[] = [...WEEKDAYS];
    const firstDays = tokens[0] ? parseDays(tokens[0]) : null;
    if (firstDays) {
      days = firstDays;
      tokens.shift();
    }

    /* What is left: times, "off"/"closed", or nothing (open all day). */
    let times: TimeRange[];
    if (tokens.length === 0) {
      times = [{ from: '00:00', to: '24:00' }];
    } else if (tokens.length === 1 && (tokens[0] === 'off' || tokens[0] === 'closed')) {
      times = [];
    } else if (tokens.length === 1 && tokens[0]) {
      const parsed = parseTimes(tokens[0]);
      if (!parsed) return null;
      times = parsed;
    } else {
      return null;
    }

    let period = periods.find((candidate) => sameMonths(candidate.months, months));
    if (!period) {
      period = { months, week: {} };
      periods.push(period);
    }
    /* As in OpenStreetMap, a later rule replaces the hours of the days it names. */
    for (const day of days) period.week[day] = times;
  }

  return periods.length > 0 ? { alwaysOpen: false, periods } : null;
}

function compressList<T extends string>(items: readonly T[], list: readonly T[]): string {
  const indexes = [...new Set(items.map((item) => list.indexOf(item)))].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = 0;
  while (start < indexes.length) {
    let end = start;
    while (end + 1 < indexes.length && indexes[end + 1] === (indexes[end] ?? 0) + 1) end += 1;
    const first = list[indexes[start] ?? 0] ?? '';
    const last = list[indexes[end] ?? 0] ?? '';
    parts.push(end > start ? `${first}-${last}` : first);
    start = end + 1;
  }
  return parts.join(',');
}

const formatTimes = (times: readonly TimeRange[]): string =>
  times.length === 0 ? 'off' : times.map((range) => `${range.from}-${range.to}`).join(',');

/** Writes opening hours back to OpenStreetMap text; empty when nothing is open. */
export function formatOpeningHours(hours: OpeningHours): string {
  if (hours.alwaysOpen) return '24/7';

  const rules: string[] = [];
  for (const period of hours.periods) {
    const monthPrefix =
      period.months.length === 0 || period.months.length === 12
        ? ''
        : `${compressList(
            period.months.map((month) => MONTHS[month - 1] ?? 'Jan'),
            MONTHS,
          )} `;

    /* Days with the same hours share one rule: "Mo-Fr 10:00-17:00". */
    const groups = new Map<string, Weekday[]>();
    for (const day of WEEKDAYS) {
      const times = period.week[day];
      if (!times || times.length === 0) continue;
      const key = formatTimes(times);
      groups.set(key, [...(groups.get(key) ?? []), day]);
    }
    for (const [times, days] of groups) {
      rules.push(`${monthPrefix}${compressList(days, WEEKDAYS)} ${times}`);
    }

    const holidays = period.week.PH;
    if (holidays) rules.push(`${monthPrefix}PH ${formatTimes(holidays)}`);
  }
  return rules.join('; ');
}

/** True when the text is opening hours the app can show as a timetable. */
export function isValidOpeningHours(text: string): boolean {
  return parseOpeningHours(text) !== null;
}

const minutes = (time: string): number => {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  return hours * 60 + mins;
};

/** Monday-first index of a JavaScript day (0 = Sunday). */
const weekdayOf = (date: Date): Weekday => WEEKDAYS[(date.getDay() + 6) % 7] ?? 'Mo';

/** The period that applies in a month: the one naming it, else the all-year one. */
export function periodFor(hours: OpeningHours, month: number): OpeningPeriod | null {
  return (
    hours.periods.find((period) => period.months.includes(month)) ??
    hours.periods.find((period) => period.months.length === 0) ??
    null
  );
}

export type OpeningStatus =
  | { kind: 'always' }
  | { kind: 'open'; until: string }
  | { kind: 'closed'; opens: { day: Weekday; inDays: number; at: string } | null }
  | { kind: 'unknown' };

/**
 * Open or closed at a moment, and until / from when. Public holidays are not
 * known to the app, so they never count; neither do other seasons' hours.
 */
export function openingStatus(hours: OpeningHours, now: Date): OpeningStatus {
  if (hours.alwaysOpen) return { kind: 'always' };
  const period = periodFor(hours, now.getMonth() + 1);
  if (!period) return { kind: 'unknown' };

  const today = weekdayOf(now);
  const current = now.getHours() * 60 + now.getMinutes();

  /* Still open after midnight from yesterday's late range, e.g. 20:00-02:00. */
  const yesterday = WEEKDAYS[(WEEKDAYS.indexOf(today) + 6) % 7] ?? 'Mo';
  for (const range of period.week[yesterday] ?? []) {
    if (minutes(range.to) < minutes(range.from) && current < minutes(range.to)) {
      return { kind: 'open', until: range.to };
    }
  }

  for (const range of period.week[today] ?? []) {
    const from = minutes(range.from);
    let to = minutes(range.to);
    if (to <= from) to += 24 * 60;
    if (current >= from && current < to) return { kind: 'open', until: range.to };
  }

  for (let inDays = 0; inDays < 7; inDays += 1) {
    const day = WEEKDAYS[(WEEKDAYS.indexOf(today) + inDays) % 7] ?? 'Mo';
    const next = (period.week[day] ?? [])
      .filter((range) => inDays > 0 || minutes(range.from) > current)
      .sort((a, b) => minutes(a.from) - minutes(b.from))[0];
    if (next) return { kind: 'closed', opens: { day, inDays, at: next.from } };
  }
  return { kind: 'closed', opens: null };
}
