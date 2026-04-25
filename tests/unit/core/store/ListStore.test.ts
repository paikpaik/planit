import { ListStore } from '@/core/store/ListStore';
import type { ListsFile } from '@/core/types';
import { DEFAULT_LISTS } from '@/core/types';

function makePersistence(initial: ListsFile = { lists: [...DEFAULT_LISTS] }) {
  let state = initial;
  return {
    loadLists: jest.fn(async () => state),
    saveLists: jest.fn(async (file: ListsFile) => {
      state = file;
    }),
  };
}

describe('ListStore.init', () => {
  it('loads lists from persistence', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].id).toBe('list_inbox');
  });
});

describe('ListStore.add', () => {
  it('adds a list with a generated id and next order, persists, notifies', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    const created = await store.add({ name: '업무', color: '#2C7EF8' });
    expect(created.id).toMatch(/^list_/);
    expect(created.order).toBe(1);
    expect(store.getAll()).toHaveLength(2);
    expect(persistence.saveLists).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ListStore.update', () => {
  it('patches an existing list, persists, notifies', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    await store.update('list_inbox', { name: '받은 일정', color: '#FF5733' });
    const got = store.getById('list_inbox')!;
    expect(got.name).toBe('받은 일정');
    expect(got.color).toBe('#FF5733');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('no-ops on unknown id', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();
    const listener = jest.fn();
    store.subscribe(listener);

    await store.update('nope', { name: 'x' });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('ListStore.remove', () => {
  it('removes a list, persists, notifies', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();
    const created = await store.add({ name: '삭제대상', color: '#000' });

    const listener = jest.fn();
    store.subscribe(listener);

    await store.remove(created.id);
    expect(store.getById(created.id)).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refuses to remove the protected inbox list', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();

    await expect(store.remove('list_inbox')).rejects.toThrow(/inbox/i);
    expect(store.getById('list_inbox')).toBeDefined();
  });
});

describe('ListStore.refresh', () => {
  it('notifies when lists changed externally', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    persistence.loadLists.mockResolvedValueOnce({
      lists: [
        { id: 'list_inbox', name: 'Inbox', color: '#8A8A8A', order: 0 },
        { id: 'list_new', name: '외부 추가', color: '#123456', order: 1 },
      ],
    });

    await store.refresh();
    expect(store.getAll()).toHaveLength(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when reloaded content is identical', async () => {
    const persistence = makePersistence();
    const store = new ListStore(persistence);
    await store.init();

    const listener = jest.fn();
    store.subscribe(listener);

    persistence.loadLists.mockResolvedValueOnce({ lists: [...DEFAULT_LISTS] });
    await store.refresh();
    expect(listener).not.toHaveBeenCalled();
  });
});
