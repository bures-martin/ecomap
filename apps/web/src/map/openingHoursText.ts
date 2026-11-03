import { WEEKDAYS, type DayKey, type TimeRange, type Weekday } from '@ecomap/shared';

/**
 * Names for days and months in the reader's language, from the browser's own
 * locale data - so Danish and English (and any language added later) need no
 * translation strings for them.
 */

/* 1 January 2024 was a Monday. */
const mondayOf2024 = (index: number): Date => new Date(2024, 0, 1 + index);

export function weekdayName(day: Weekday, language: string, width: 'long' | 'short'): string {
  const name = new Intl.DateTimeFormat(language, { weekday: width }).format(
    mondayOf2024(WEEKDAYS.indexOf(day)),
  );
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}

export function monthName(month: number, language: string, width: 'long' | 'short'): string {
  const name = new Intl.DateTimeFormat(language, { month: width }).format(
    new Date(2024, month - 1, 1),
  );
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}

/** "April–June, September" from [4, 5, 6, 9]. */
export function monthsLabel(months: readonly number[], language: string): string {
  const sorted = [...months].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const month of sorted) {
    const last = runs.at(-1);
    if (last && month === last[1] + 1) last[1] = month;
    else runs.push([month, month]);
  }
  return runs
    .map(([from, to]) =>
      from === to
        ? monthName(from, language, 'long')
        : `${monthName(from, language, 'long')}–${monthName(to, language, 'long')}`,
    )
    .join(', ');
}

export const isAllDay = (times: readonly TimeRange[]): boolean =>
  times.length === 1 && times[0]?.from === '00:00' && times[0].to === '24:00';

export const rangesLabel = (times: readonly TimeRange[]): string =>
  times.map((range) => `${range.from}–${range.to}`).join(', ');

export const DAY_ROWS: readonly DayKey[] = [...WEEKDAYS, 'PH'];
