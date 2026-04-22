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
