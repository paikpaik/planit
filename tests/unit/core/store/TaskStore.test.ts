import type { TaskInput } from '@/core/store/TaskStore';
import { TaskStore } from '@/core/store/TaskStore';
import type { Task, TasksFile } from '@/core/types';
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

function makeTaskInput(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
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
    ...overrides,
  };
}

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

describe('TaskStore.init', () => {
  it('loads tasks from persistence', async () => {
    const persistence = makePersistence({
      schemaVersion: SCHEMA_VERSION,
      tasks: [makeTask({ id: 'tsk_1', title: 'existing', date: '2026-04-20' })],
    });
    const store = new TaskStore(persistence);
    await store.init();
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].title).toBe('existing');
  });

  it('normalizes missing recurrence field to null (migration)', async () => {
    const taskWithoutRecurrence = {
      ...makeTask({ id: 'tsk_old' }),
      recurrence: undefined,
    } as unknown as Task;
    const persistence = makePersistence({
      schemaVersion: SCHEMA_VERSION,
      tasks: [taskWithoutRecurrence],
    });
    const store = new TaskStore(persistence);
    await store.init();
    expect(store.getAll()[0].recurrence).toBeNull();
  });
});

describe('TaskStore.add', () => {
  it('adds a task, assigns id and timestamps, persists, notifies subscribers', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    const created = await store.add(makeTaskInput({
      title: '디자인 리뷰',
      date: '2026-04-20',
      start: '14:00',
      end: '15:00',
      priority: 'med',
    }));

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
    const created = await store.add(makeTaskInput({ title: 'old' }));
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
    const created = await store.add(makeTaskInput({ title: 'doomed' }));

    const listener = jest.fn();
    store.subscribe(listener);

    await store.remove(created.id);
    expect(store.getAll()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('TaskStore.refresh', () => {
  it('reloads tasks from persistence and notifies when content changes', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    persistence.loadTasks.mockResolvedValueOnce({
      schemaVersion: SCHEMA_VERSION,
      tasks: [makeTask({ id: 'tsk_external', title: '외부 추가', date: '2026-04-23', createdAt: 1, updatedAt: 1 })],
    });

    await store.refresh();

    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].title).toBe('외부 추가');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when reloaded content is identical', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add(makeTaskInput({ title: 'same' }));

    const listener = jest.fn();
    store.subscribe(listener);

    persistence.loadTasks.mockResolvedValueOnce({
      schemaVersion: SCHEMA_VERSION,
      tasks: [created],
    });

    await store.refresh();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('TaskStore.toggleDone', () => {
  it('marks an open task done with a completedAt timestamp', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add(makeTaskInput({ title: 't' }));

    await store.toggleDone(created.id);

    const got = store.getAll().find((t) => t.id === created.id)!;
    expect(got.done).toBe(true);
    expect(got.completedAt).toBeGreaterThan(0);
  });

  it('reopens a done task and clears completedAt', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add(makeTaskInput({ title: 't' }));
    await store.toggleDone(created.id);
    await store.toggleDone(created.id);

    const got = store.getAll().find((t) => t.id === created.id)!;
    expect(got.done).toBe(false);
    expect(got.completedAt).toBeNull();
  });

  it('no-ops on unknown id', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const listener = jest.fn();
    store.subscribe(listener);

    await store.toggleDone('nope');
    expect(listener).not.toHaveBeenCalled();
  });

  it('반복 태스크 완료 시 다음 occurrence를 자동 생성한다', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add(makeTaskInput({
      title: '매일 운동',
      date: '2026-04-24',
      recurrence: { type: 'daily' },
    }));

    await store.toggleDone(created.id);

    const all = store.getAll();
    expect(all).toHaveLength(2);
    const original = all.find((t) => t.id === created.id)!;
    const next = all.find((t) => t.id !== created.id)!;
    expect(original.done).toBe(true);
    expect(next.done).toBe(false);
    expect(next.date).toBe('2026-04-25');
    expect(next.recurrence).toEqual({ type: 'daily' });
  });

  it('date가 없는 반복 태스크는 다음 occurrence를 생성하지 않는다', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();
    const created = await store.add(makeTaskInput({
      title: 'inbox 반복',
      date: null,
      recurrence: { type: 'daily' },
    }));

    await store.toggleDone(created.id);

    expect(store.getAll()).toHaveLength(1);
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

    await store.add(makeTaskInput({ title: 'x' }));
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('TaskStore.getByDate', () => {
  it('returns tasks matching the given ISO date, sorted by start time (nulls last)', async () => {
    const persistence = makePersistence();
    const store = new TaskStore(persistence);
    await store.init();

    await store.add(makeTaskInput({ title: 'no time',  date: '2026-04-20' }));
    await store.add(makeTaskInput({ title: 'afternoon', date: '2026-04-20', start: '14:00' }));
    await store.add(makeTaskInput({ title: 'morning',   date: '2026-04-20', start: '09:00' }));
    await store.add(makeTaskInput({ title: 'other day', date: '2026-04-21', start: '10:00' }));

    const result = store.getByDate('2026-04-20');
    expect(result.map((t) => t.title)).toEqual(['morning', 'afternoon', 'no time']);
  });
});
