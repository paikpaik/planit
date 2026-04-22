import { buildTaskInput, parseTimeInput } from '@/features/calendar/quickAdd';

describe('parseTimeInput', () => {
  it('returns empty for blank string', () => {
    expect(parseTimeInput('')).toEqual({ kind: 'empty' });
    expect(parseTimeInput('  ')).toEqual({ kind: 'empty' });
  });

  it('normalizes single-digit hour to HH:mm', () => {
    expect(parseTimeInput('9:30')).toEqual({ kind: 'ok', value: '09:30' });
  });

  it('accepts canonical HH:mm', () => {
    expect(parseTimeInput('14:30')).toEqual({ kind: 'ok', value: '14:30' });
    expect(parseTimeInput('00:00')).toEqual({ kind: 'ok', value: '00:00' });
    expect(parseTimeInput('23:59')).toEqual({ kind: 'ok', value: '23:59' });
  });

  it('rejects out-of-range hour or minute', () => {
    expect(parseTimeInput('24:00')).toEqual({ kind: 'invalid' });
    expect(parseTimeInput('12:60')).toEqual({ kind: 'invalid' });
  });

  it('rejects non-time input', () => {
    expect(parseTimeInput('abc')).toEqual({ kind: 'invalid' });
    expect(parseTimeInput('9')).toEqual({ kind: 'invalid' });
    expect(parseTimeInput('09-30')).toEqual({ kind: 'invalid' });
  });
});

describe('buildTaskInput', () => {
  it('builds a task input with sensible defaults', () => {
    const input = buildTaskInput({
      title: '  디자인 리뷰  ',
      date: '2026-04-22',
      start: '14:00',
      end: '15:00',
      listId: 'list_work',
    });
    expect(input).toEqual({
      title: '디자인 리뷰',
      listId: 'list_work',
      tags: [],
      date: '2026-04-22',
      start: '14:00',
      end: '15:00',
      priority: 'none',
      done: false,
      completedAt: null,
      description: '',
      subtasks: [],
      noteRef: null,
    });
  });

  it('allows null start/end for all-day tasks', () => {
    const input = buildTaskInput({
      title: '종일 작업',
      date: '2026-04-22',
      start: null,
      end: null,
      listId: 'list_inbox',
    });
    expect(input.start).toBeNull();
    expect(input.end).toBeNull();
  });
});
