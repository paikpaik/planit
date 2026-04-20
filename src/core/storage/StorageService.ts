import type { App } from 'obsidian';

import type { ListsFile, TasksFile } from '../types';
import { DEFAULT_LISTS, SCHEMA_VERSION } from '../types';
import { VaultFileAdapter } from './VaultFileAdapter';

const PLANIT_DIR = '.planit';
const TASKS_PATH = `${PLANIT_DIR}/tasks.json`;
const LISTS_PATH = `${PLANIT_DIR}/lists.json`;

export class StorageService {
  private adapter: VaultFileAdapter;

  constructor(app: App) {
    this.adapter = new VaultFileAdapter(app);
  }

  async loadTasks(): Promise<TasksFile> {
    if (!(await this.adapter.exists(TASKS_PATH))) {
      const initial: TasksFile = { schemaVersion: SCHEMA_VERSION, tasks: [] };
      await this.saveTasks(initial);
      return initial;
    }
    const raw = await this.adapter.read(TASKS_PATH);
    return JSON.parse(raw) as TasksFile;
  }

  async saveTasks(file: TasksFile): Promise<void> {
    await this.adapter.write(TASKS_PATH, JSON.stringify(file, null, 2));
  }

  async loadLists(): Promise<ListsFile> {
    if (!(await this.adapter.exists(LISTS_PATH))) {
      const initial: ListsFile = { lists: [...DEFAULT_LISTS] };
      await this.saveLists(initial);
      return initial;
    }
    const raw = await this.adapter.read(LISTS_PATH);
    return JSON.parse(raw) as ListsFile;
  }

  async saveLists(file: ListsFile): Promise<void> {
    await this.adapter.write(LISTS_PATH, JSON.stringify(file, null, 2));
  }
}
