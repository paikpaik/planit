import type { RecurrenceRule } from '../core/types';
import { toISODate } from './date';

export function calcNextDate(currentIso: string, rule: RecurrenceRule): string {
  const [y, m, d] = currentIso.split('-').map(Number);

  switch (rule.type) {
    case 'daily':
      return toISODate(new Date(y, m - 1, d + 1));

    case 'weekly': {
      const sorted = [...rule.days].sort((a, b) => a - b);
      const dow = new Date(y, m - 1, d).getDay();
      const next = sorted.find((day) => day > dow) ?? sorted[0];
      const diff = next > dow ? next - dow : 7 - dow + next;
      return toISODate(new Date(y, m - 1, d + diff));
    }

    case 'monthly': {
      // 다음달 같은 날, 말일 초과 시 클램핑
      const lastDay = new Date(y, m + 1, 0).getDate(); // m = 다음달 (0-based)
      return toISODate(new Date(y, m, Math.min(rule.day, lastDay)));
    }

    case 'nweekly':
      return toISODate(new Date(y, m - 1, d + rule.n * 7));
  }
}

const RECURRENCE_LABELS: Record<RecurrenceRule['type'], string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  nweekly: 'N주마다',
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatRecurrenceLabel(rule: RecurrenceRule): string {
  switch (rule.type) {
    case 'daily':
      return '매일';
    case 'weekly':
      return `매주 ${rule.days.map((d) => DAY_LABELS[d]).join('·')}`;
    case 'monthly':
      return `매월 ${rule.day}일`;
    case 'nweekly':
      return `${rule.n === 2 ? '격주' : `${rule.n}주마다`} ${DAY_LABELS[rule.day]}`;
  }
}

export { DAY_LABELS,RECURRENCE_LABELS };
