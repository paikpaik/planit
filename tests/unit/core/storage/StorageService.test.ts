import { StorageService } from '@/core/storage';
import { SCHEMA_VERSION } from '@/core/types';

type MockAdapter = {
  exists: jest.Mock;
  read: jest.Mock;
  write: jest.Mock;
  mkdir: jest.Mock;
  remove: jest.Mock;
};

function makeApp(): { app: any; adapter: MockAdapter } {
  const adapter: MockAdapter = {
    exists: jest.fn(),
    read: jest.fn(),
    write: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const app = { vault: { adapter } };
  return { app, adapter };
}

describe('StorageService.loadTasks', () => {
  it('creates an empty tasks file when none exists', async () => {
    const { app, adapter } = makeApp();
    adapter.exists.mockResolvedValue(false);

    const storage = new StorageService(app);
    const result = await storage.loadTasks();

    expect(result).toEqual({ schemaVersion: SCHEMA_VERSION, tasks: [] });
    expect(adapter.write).toHaveBeenCalledWith(
      '.planit/tasks.json',
      expect.stringContaining('"schemaVersion": 1')
    );
  });

  it('reads existing tasks file', async () => {
    const { app, adapter } = makeApp();
    adapter.exists.mockResolvedValue(true);
    adapter.read.mockResolvedValue(
      JSON.stringify({ schemaVersion: 1, tasks: [{ id: 't1' }] })
    );

    const storage = new StorageService(app);
    const result = await storage.loadTasks();

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe('t1');
  });
});

describe('StorageService.loadLists', () => {
  it('seeds default lists when none exist', async () => {
    const { app, adapter } = makeApp();
    adapter.exists.mockResolvedValue(false);

    const storage = new StorageService(app);
    const result = await storage.loadLists();

    expect(result.lists[0].id).toBe('list_inbox');
  });
});
