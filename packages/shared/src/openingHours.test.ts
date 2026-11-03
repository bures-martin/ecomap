import { describe, expect, it } from 'vitest';
import {
  formatOpeningHours,
  openingStatus,
  parseOpeningHours,
  type OpeningHours,
} from './openingHours.js';

const parse = (text: string): OpeningHours => {
  const hours = parseOpeningHours(text);
  if (!hours) throw new Error(`Could not parse ${text}`);
  return hours;
};

/** Monday 3 November 2025 is a Monday; the day and time are local. */
const at = (day: number, time: string, month = 11): Date => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const date = new Date(2025, month - 1, 1, hours, minutes);
  /* Move to the requested weekday (1 = Monday ... 7 = Sunday) in that month. */
  const offset = (day - ((date.getDay() + 6) % 7) - 1 + 7) % 7;
  date.setDate(date.getDate() + offset);
  return date;
};

describe('parseOpeningHours', () => {
  it('reads weekday ranges and single days', () => {
    const hours = parse('Mo-Fr 10:00-17:00; Sa 10:00-13:00');
    expect(hours.periods).toHaveLength(1);
    const week = hours.periods[0]?.week;
    expect(week?.Mo).toEqual([{ from: '10:00', to: '17:00' }]);
    expect(week?.Fr).toEqual([{ from: '10:00', to: '17:00' }]);
    expect(week?.Sa).toEqual([{ from: '10:00', to: '13:00' }]);
    expect(week?.Su).toBeUndefined();
  });

  it('reads 24/7', () => {
    expect(parse('24/7').alwaysOpen).toBe(true);
  });

  it('reads public holidays, lists and ranges that wrap round the week', () => {
    const week = parse('PH,We,Fr-Mo 12:00-17:30; Tu,Th 10:00-17:30').periods[0]?.week;
    expect(Object.keys(week ?? {}).sort()).toEqual(
      ['Fr', 'Mo', 'PH', 'Sa', 'Su', 'Th', 'Tu', 'We'].sort(),
    );
    expect(week?.Tu).toEqual([{ from: '10:00', to: '17:30' }]);
  });

  it('reads seasons as separate periods', () => {
    const hours = parse(
      'Apr-Jun,Sep-Oct Mo-Fr 09:00-16:00; Apr-Jun,Sep-Oct Sa-Su 10:00-14:00; Jul-Aug Mo-Fr 09:00-17:00',
    );
    expect(hours.periods.map((period) => period.months)).toEqual([
      [4, 5, 6, 9, 10],
      [7, 8],
    ]);
  });

  it('reads split hours and "off"', () => {
    const week = parse('Mo-Sa 09:00-12:00,13:00-17:00; We off').periods[0]?.week;
    expect(week?.Mo).toHaveLength(2);
    expect(week?.We).toEqual([]);
  });

  it('refuses what it does not understand', () => {
    expect(parseOpeningHours('Saturdays from 10')).toBeNull();
    expect(parseOpeningHours('Mo 25:00-26:00')).toBeNull();
    expect(parseOpeningHours('sunrise-sunset')).toBeNull();
    expect(parseOpeningHours('')).toBeNull();
  });
});

describe('formatOpeningHours', () => {
  it('round-trips the common forms', () => {
    for (const text of [
      '24/7',
      'Mo-Fr 10:00-17:00; Sa 10:00-13:00',
      'Mo-Sa 09:00-12:00,13:00-17:00',
      'Apr-Jun,Sep-Oct Mo-Fr 09:00-16:00; Jul-Aug Mo-Su 09:00-17:00',
    ]) {
      expect(formatOpeningHours(parse(text))).toBe(text);
    }
  });

  it('groups days with the same hours', () => {
    expect(
      formatOpeningHours({
        alwaysOpen: false,
        periods: [
          {
            months: [],
            week: {
              Mo: [{ from: '10:00', to: '16:00' }],
              We: [{ from: '10:00', to: '16:00' }],
              Th: [{ from: '10:00', to: '16:00' }],
              Fr: [{ from: '10:00', to: '16:00' }],
              PH: [],
            },
          },
        ],
      }),
    ).toBe('Mo,We-Fr 10:00-16:00; PH off');
  });

  it('is empty when nothing is open', () => {
    expect(formatOpeningHours({ alwaysOpen: false, periods: [{ months: [], week: {} }] })).toBe('');
  });
});

describe('openingStatus', () => {
  const hours = parse('Mo-Fr 10:00-17:00; Sa 10:00-13:00');

  it('is open inside a range, until its end', () => {
    expect(openingStatus(hours, at(1, '12:00'))).toEqual({ kind: 'open', until: '17:00' });
  });

  it('opens later today', () => {
    expect(openingStatus(hours, at(2, '08:00'))).toEqual({
      kind: 'closed',
      opens: { day: 'Tu', inDays: 0, at: '10:00' },
    });
  });

  it('opens on a later day', () => {
    expect(openingStatus(hours, at(6, '14:00'))).toEqual({
      kind: 'closed',
      opens: { day: 'Mo', inDays: 2, at: '10:00' },
    });
  });

  it('follows the season of the month', () => {
    const seasonal = parse('Jul-Aug Mo-Su 09:00-20:00; Sep-Jun Sa 10:00-14:00');
    expect(openingStatus(seasonal, at(1, '12:00', 7))).toEqual({ kind: 'open', until: '20:00' });
    expect(openingStatus(seasonal, at(1, '12:00', 11)).kind).toBe('closed');
  });

  it('stays open past midnight', () => {
    const late = parse('Fr 20:00-02:00');
    expect(openingStatus(late, at(6, '01:00'))).toEqual({ kind: 'open', until: '02:00' });
  });
});
