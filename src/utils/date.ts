import { formatMonthDay, t } from '../i18n';

export type WeekStart = 0 | 1;

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getUpcomingDates(fromIso: string, days: number): string[] {
  const [y, m, d] = fromIso.split('-').map(Number);
  return Array.from({ length: days }, (_, i) => {
    return toISODate(new Date(y, m - 1, d + i + 1));
  });
}

export function formatDateLabel(iso: string, todayIso: string): string {
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const tomorrowIso = toISODate(new Date(ty, tm - 1, td + 1));
  if (iso === todayIso) return t('date.today');
  if (iso === tomorrowIso) return t('date.tomorrow');
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return formatMonthDay(m, d, dow);
}

export function getWeekStart(date: Date, weekStart: WeekStart): Date {
  const diff = (date.getDay() - weekStart + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff);
}

// Returns a 6×7 matrix of Date objects covering the target month.
// Week starts on Sunday (0) or Monday (1).
export function getMonthMatrix(year: number, monthIndex: number, weekStart: WeekStart): Date[][] {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(year, monthIndex, 1 - offset);

  const rows: Date[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) {
      row.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7 + c));
    }
    rows.push(row);
  }
  return rows;
}
