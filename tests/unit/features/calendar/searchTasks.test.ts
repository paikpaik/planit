import type { Task } from '@/core/types';
import { searchTasks } from '@/features/calendar/searchTasks';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_1',
    title: 'test',
    listId: 'list_inbox',
    tags: [],
    date: null,
    start: null,
    end: null,
    priority: 'none',
    done: false,
    completedAt: null,
    description: '',
    subtasks: [],
    noteRef: null,
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const TASKS = [
  makeTask({ id: 'tsk_1', title: '주간 리뷰',      tags: ['work'],             description: '팀과 함께' }),
  makeTask({ id: 'tsk_2', title: '장보기',          tags: ['personal'],         description: '' }),
  makeTask({ id: 'tsk_3', title: '디자인 피드백',   tags: ['work', 'design'],   description: '디자인 리뷰' }),
];

describe('searchTasks', () => {
  it('returns empty array for blank query', () => {
    expect(searchTasks(TASKS, '')).toHaveLength(0);
    expect(searchTasks(TASKS, '   ')).toHaveLength(0);
  });

  it('matches by title', () => {
    const result = searchTasks(TASKS, '주간');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tsk_1');
  });

  it('matches by description', () => {
    const result = searchTasks(TASKS, '팀과');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tsk_1');
  });

  it('matches by tag', () => {
    const result = searchTasks(TASKS, 'design');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tsk_3');
  });

  it('is case-insensitive', () => {
    expect(searchTasks(TASKS, 'WORK')).toHaveLength(2);
  });

  it('returns multiple matches across title and description', () => {
    // '리뷰' → tsk_1(제목), tsk_3(설명)
    const result = searchTasks(TASKS, '리뷰');
    expect(result.map((t) => t.id).sort()).toEqual(['tsk_1', 'tsk_3']);
  });

  it('returns empty array when nothing matches', () => {
    expect(searchTasks(TASKS, 'zzz_no_match')).toHaveLength(0);
  });
});
