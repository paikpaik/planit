import { TaskStore } from '@/core/store/TaskStore';
import type { TasksFile } from '@/core/types';
import { SCHEMA_VERSION } from '@/core/types';

function makePersistence(initial: TasksFile = { schemaVersion: SCHEMA_VERSION, tasks: [] }) {
  let state = initial;
  const saves: TasksFile[] = [];
  return {
    loadTasks: jest.fn(async () => state),
    saveTasks: jest.fn(async (file: TasksFile) => {
      state = file;
      saves.push(file);
    }),
    getState: () => state,
    getSaves: () => saves,
  };
}

describe('TaskStore.init', () => {
  it('loads tasks from persistence', async () => {
    const persistence = makePersistence({
      schemaVersion: SCHEMA_VERSION,
      tasks: [
        {
          id: 'tsk_1',
          title: 'existing',
          listId: 'list_inbox',
          tags: [],
          date: '2026-04-20',
          start: null,
          end: null,
          priority: 'none',
          done: false,
          completedAt: null,
          description: '',
          subtasks: [],
          noteRef: null,
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    });
    const store = new TaskStore(persistence);
    await store.init();
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].title).toBe('existing');
  });
});

describe('TaskStore.add', () => {
  it('adds a task, assigns id and timestamps, persists, notifies subscribers', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    const created = await store.add({
      title: '디자인 리뷰',
      listId: 'list_inbox',
      tags: [],
      date: '2026-04-20',
      start: '14:00',
      end: '15:00',
      priority: 'med',
      done: false,
      completedAt: null,
      description: '',
      subtasks: [],
      noteRef: null,
    });

    expect(created.id).toMatch(/^tsk_/);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBe(created.createdAt);
    expect(store.getAll()).toHaveLength(1);
    expect(persistence.saveTasks).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('TaskStore.update', () => {
  it('patches an existing task, bumps updatedAt, persists, notifies', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add({
      title: 'old',
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
    });
    const originalUpdatedAt = created.updatedAt;

    const listener = jest.fn();
    store.subscribe(listener);

    await new Promise((r) => setTimeout(r, 2));
    await store.update(created.id, { title: 'new' });

    const got = store.getAll().find((t) => t.id === created.id)!;
    expect(got.title).toBe('new');
    expect(got.updatedAt).toBeGreaterThan(originalUpdatedAt);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('TaskStore.remove', () => {
  it('removes a task, persists, notifies', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add({
      title: 'doomed',
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
    });

    const listener = jest.fn();
    store.subscribe(listener);

    await store.remove(created.id);
    expect(store.getAll()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('TaskStore.subscribe', () => {
  it('returns an unsubscribe function that stops notifications', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();

    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    await store.add({
      title: 'x',
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
    });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('TaskStore.getByDate', () => {
  it('returns tasks matching the given ISO date, sorted by start time (nulls last)', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();

    await store.add({
      title: 'no time',
      listId: 'list_inbox',
      tags: [],
      date: '2026-04-20',
      start: null,
      end: null,
      priority: 'none',
      done: false,
      completedAt: null,
      description: '',
      subtasks: [],
      noteRef: null,
    });
    await store.add({
      title: 'afternoon',
      listId: 'list_inbox',
      tags: [],
      date: '2026-04-20',
      start: '14:00',
      end: null,
      priority: 'none',
      done: false,
      completedAt: null,
      description: '',
      subtasks: [],
      noteRef: null,
    });
    await store.add({
      title: 'morning',
      listId: 'list_inbox',
      tags: [],
      date: '2026-04-20',
      start: '09:00',
      end: null,
      priority: 'none',
      done: false,
      completedAt: null,
      description: '',
      subtasks: [],
      noteRef: null,
    });
    await store.add({
      title: 'other day',
      listId: 'list_inbox',
      tags: [],
      date: '2026-04-21',
      start: '10:00',
      end: null,
      priority: 'none',
      done: false,
      completedAt: null,
      description: '',
      subtasks: [],
      noteRef: null,
    });

    const result = store.getByDate('2026-04-20');
    expect(result.map((t) => t.title)).toEqual(['morning', 'afternoon', 'no time']);
  });
});
