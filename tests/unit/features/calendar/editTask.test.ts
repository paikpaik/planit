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
      tags: ['meeting'],
      recurrence: { type: 'weekly', days: [1] },
      noteRef: 'daily/2026-04-22.md',
    });

    expect(patch).toEqual({
      title: '주간 리뷰',
      listId: 'list_work',
      date: '2026-04-22',
      start: '10:00',
      end: '11:00',
      priority: 'high',
      description: '회의실 A',
      tags: ['meeting'],
      recurrence: { type: 'weekly', days: [1] },
      noteRef: 'daily/2026-04-22.md',
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
      tags: [],
      recurrence: null,
      noteRef: null,
    });
    expect(patch.date).toBeNull();
    expect(patch.start).toBeNull();
  });
});
