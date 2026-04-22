import { buildTaskPatch } from '@/features/calendar/editTask';

describe('buildTaskPatch', () => {
  it('trims title and passes through edit fields', () => {
    const patch = buildTaskPatch({
      title: '  주간 리뷰 ',
      date: '2026-04-22',
      start: '10:00',
      end: '11:00',
      listId: 'list_work',
      priority: 'high',
      description: '회의실 A',
    });

    expect(patch).toEqual({
      title: '주간 리뷰',
      listId: 'list_work',
      date: '2026-04-22',
      start: '10:00',
      end: '11:00',
      priority: 'high',
      description: '회의실 A',
    });
  });

  it('keeps null date for inbox tasks', () => {
    const patch = buildTaskPatch({
      title: '언젠가',
      date: null,
      start: null,
      end: null,
      listId: 'list_inbox',
      priority: 'none',
      description: '',
    });
    expect(patch.date).toBeNull();
    expect(patch.start).toBeNull();
  });
});
