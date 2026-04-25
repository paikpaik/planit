import { calcNextDate } from '@/utils/recurrence';

describe('calcNextDate', () => {
  describe('daily', () => {
    it('다음날을 반환한다', () => {
      expect(calcNextDate('2026-04-24', { type: 'daily' })).toBe('2026-04-25');
    });

    it('월말에서 다음 달로 넘어간다', () => {
      expect(calcNextDate('2026-04-30', { type: 'daily' })).toBe('2026-05-01');
    });
  });

  describe('weekly', () => {
    it('같은 주 다음 요일을 반환한다 (월→수)', () => {
      // 2026-04-27 is Monday (day=1)
      expect(calcNextDate('2026-04-27', { type: 'weekly', days: [1, 3] })).toBe('2026-04-29');
    });

    it('마지막 요일 완료 시 다음 주 첫 요일로 이동한다 (금→다음주 월)', () => {
      // 2026-05-01 is Friday (day=5)
      expect(calcNextDate('2026-05-01', { type: 'weekly', days: [1, 5] })).toBe('2026-05-04');
    });

    it('단일 요일은 7일 후를 반환한다', () => {
      // 2026-04-27 is Monday
      expect(calcNextDate('2026-04-27', { type: 'weekly', days: [1] })).toBe('2026-05-04');
    });
  });

  describe('monthly', () => {
    it('다음달 같은 날을 반환한다', () => {
      expect(calcNextDate('2026-04-15', { type: 'monthly', day: 15 })).toBe('2026-05-15');
    });

    it('12월에서 1월로 넘어간다', () => {
      expect(calcNextDate('2025-12-01', { type: 'monthly', day: 1 })).toBe('2026-01-01');
    });

    it('다음달에 해당 날짜가 없으면 말일로 클램핑한다 (31일 → 2월)', () => {
      expect(calcNextDate('2026-01-31', { type: 'monthly', day: 31 })).toBe('2026-02-28');
    });
  });

  describe('nweekly', () => {
    it('n주 후 같은 요일을 반환한다 (격주)', () => {
      // 2026-04-22 is Wednesday
      expect(calcNextDate('2026-04-22', { type: 'nweekly', n: 2, day: 3 })).toBe('2026-05-06');
    });

    it('3주마다 반환한다', () => {
      expect(calcNextDate('2026-04-24', { type: 'nweekly', n: 3, day: 5 })).toBe('2026-05-15');
    });
  });
});
