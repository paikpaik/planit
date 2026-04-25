import { addMonths, getMonthMatrix, isSameDay, toISODate } from '@/utils/date';

describe('addMonths', () => {
  it('adds positive months', () => {
    expect(addMonths(new Date(2026, 0, 15), 2)).toEqual(new Date(2026, 2, 15));
  });

  it('handles year wrap forward', () => {
    expect(addMonths(new Date(2026, 10, 1), 3)).toEqual(new Date(2027, 1, 1));
  });

  it('handles year wrap backward', () => {
    expect(addMonths(new Date(2026, 1, 15), -3)).toEqual(new Date(2025, 10, 15));
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day', () => {
    expect(isSameDay(new Date(2026, 3, 20, 9, 0), new Date(2026, 3, 20, 23, 59))).toBe(true);
  });

  it('returns false across midnight', () => {
    expect(isSameDay(new Date(2026, 3, 20, 23, 59), new Date(2026, 3, 21, 0, 0))).toBe(false);
  });
});

describe('toISODate', () => {
  it('formats to YYYY-MM-DD in local time', () => {
    expect(toISODate(new Date(2026, 3, 5))).toBe('2026-04-05');
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('getMonthMatrix', () => {
  it('returns 6 rows of 7 days covering the month (week starts Mon)', () => {
    const matrix = getMonthMatrix(2026, 3, 1);
    expect(matrix).toHaveLength(6);
    matrix.forEach((row) => expect(row).toHaveLength(7));
  });

  it('starts on the given weekDayStart (1 = Monday)', () => {
    const matrix = getMonthMatrix(2026, 3, 1);
    expect(matrix[0][0].getDay()).toBe(1);
  });

  it('starts on Sunday when weekDayStart is 0', () => {
    const matrix = getMonthMatrix(2026, 3, 0);
    expect(matrix[0][0].getDay()).toBe(0);
  });

  it('contains the first day of the target month', () => {
    const matrix = getMonthMatrix(2026, 3, 1);
    const flat = matrix.flat();
    expect(flat.some((d) => d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() === 1)).toBe(true);
  });

  it('first day of April 2026 (a Wednesday) lands correctly when week starts Monday', () => {
    const matrix = getMonthMatrix(2026, 3, 1);
    // April 1, 2026 is a Wednesday — weekday index 3 when week starts Monday (Mon=0..Sun=6)
    expect(matrix[0][2].getDate()).toBe(1);
    expect(matrix[0][2].getMonth()).toBe(3);
  });
});
