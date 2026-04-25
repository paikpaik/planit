import {
  formatDayFull,
  formatMonthDay,
  formatWeekRange,
  formatYearMonth,
  getLocale,
  setLocale,
  t,
  weekdayShort,
} from '@/i18n';

afterEach(() => {
  setLocale('ko');
});

describe('setLocale / getLocale', () => {
  it('기본 로케일은 ko', () => {
    expect(getLocale()).toBe('ko');
  });

  it('setLocale로 en으로 변경 가능', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
  });
});

describe('t()', () => {
  it('ko 번역 반환', () => {
    expect(t('date.today')).toBe('오늘');
    expect(t('btn.save')).toBe('저장');
  });

  it('en 번역 반환', () => {
    setLocale('en');
    expect(t('date.today')).toBe('Today');
    expect(t('btn.save')).toBe('Save');
  });

  it('{var} 보간', () => {
    expect(t('list.deleteConfirm', { name: '업무', count: 3 })).toContain('업무');
    expect(t('list.deleteConfirm', { name: '업무', count: 3 })).toContain('3');
  });

  it('en {var} 보간', () => {
    setLocale('en');
    const msg = t('list.deleteConfirm', { name: 'Work', count: 5 });
    expect(msg).toContain('Work');
    expect(msg).toContain('5');
  });

  it('removeTag 보간', () => {
    expect(t('editTask.removeTag', { tag: 'work' })).toBe('#work 삭제');
  });
});

describe('weekdayShort()', () => {
  it('ko — 일월화수목금토', () => {
    expect(weekdayShort()[0]).toBe('일');
    expect(weekdayShort()[1]).toBe('월');
    expect(weekdayShort()[6]).toBe('토');
  });

  it('en — Su Mo Sa', () => {
    setLocale('en');
    expect(weekdayShort()[0]).toBe('Su');
    expect(weekdayShort()[1]).toBe('Mo');
    expect(weekdayShort()[6]).toBe('Sa');
  });
});

describe('formatYearMonth()', () => {
  it('ko — 2026년 4월', () => {
    expect(formatYearMonth(2026, 4)).toBe('2026년 4월');
  });

  it('en — Apr 2026', () => {
    setLocale('en');
    expect(formatYearMonth(2026, 4)).toBe('Apr 2026');
  });
});

describe('formatWeekRange()', () => {
  it('ko — 같은 달', () => {
    expect(formatWeekRange(2026, 4, 20, 4, 26)).toBe('2026년 4월 20일 – 26일');
  });

  it('ko — 달이 다를 때', () => {
    expect(formatWeekRange(2026, 4, 27, 5, 3)).toBe('4월 27일 – 5월 3일');
  });

  it('en — 같은 달', () => {
    setLocale('en');
    expect(formatWeekRange(2026, 4, 20, 4, 26)).toBe('Apr 20 – 26');
  });

  it('en — 달이 다를 때', () => {
    setLocale('en');
    expect(formatWeekRange(2026, 4, 27, 5, 3)).toBe('Apr 27 – May 3');
  });
});

describe('formatDayFull()', () => {
  it('ko', () => {
    // 2026-04-24 is Friday (dow=5)
    expect(formatDayFull(2026, 4, 24, 5)).toBe('2026년 4월 24일 (금)');
  });

  it('en', () => {
    setLocale('en');
    expect(formatDayFull(2026, 4, 24, 5)).toBe('Apr 24, 2026 (Fr)');
  });
});

describe('formatMonthDay()', () => {
  it('ko', () => {
    expect(formatMonthDay(4, 24, 5)).toBe('4월 24일 (금)');
  });

  it('en', () => {
    setLocale('en');
    expect(formatMonthDay(4, 24, 5)).toBe('Apr 24 (Fr)');
  });
});
