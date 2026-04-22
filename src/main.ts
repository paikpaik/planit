import type { EventRef } from 'obsidian';
import { Notice, Plugin } from 'obsidian';

import { StorageService } from './core/storage';
import { TaskStore } from './core/store';
import type { ListsFile, PlanitSettings } from './core/types';
import { DEFAULT_SETTINGS, VIEW_TYPE_PLANIT } from './core/types';
import { PlanitView } from './features/calendar/PlanitView';
import { toISODate } from './utils/date';

const TASKS_FILE_PATH = '.planit/tasks.json';
const EXTERNAL_REFRESH_DEBOUNCE_MS = 100;

export default class PlanitPlugin extends Plugin {
  settings!: PlanitSettings;
  storage!: StorageService;
  taskStore!: TaskStore;
  lists!: ListsFile;
  private externalRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.storage = new StorageService(this.app);
    this.taskStore = new TaskStore(this.storage);
    await this.taskStore.init();
    this.lists = await this.storage.loadLists();

    this.registerView(VIEW_TYPE_PLANIT, (leaf) => new PlanitView(leaf, this));

    this.addRibbonIcon('calendar', 'Open Planit', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-view',
      name: 'Open Planit',
      callback: () => {
        this.activateView();
      },
    });

    // 'raw' fires for files outside Obsidian's markdown index (including dot-prefix folders),
    // so external writes to .planit/tasks.json by Claudian or manual edits trigger a refresh.
    const vaultOnRaw = (this.app.vault as unknown as {
      on(name: 'raw', cb: (path: string) => void): EventRef;
    }).on;
    this.registerEvent(
      vaultOnRaw.call(this.app.vault, 'raw', (path: string) => {
        if (path !== TASKS_FILE_PATH) return;
        this.scheduleExternalRefresh();
      })
    );

    this.addCommand({
      id: 'seed-sample-task-today',
      name: 'Seed sample task on today',
      callback: async () => {
        await this.taskStore.add({
          title: '샘플 태스크',
          listId: this.settings.defaultListId,
          tags: [],
          date: toISODate(new Date()),
          start: null,
          end: null,
          priority: 'med',
          done: false,
          completedAt: null,
          description: '',
          subtasks: [],
          noteRef: null,
        });
        new Notice('샘플 태스크를 추가했습니다');
      },
    });
  }

  async onunload(): Promise<void> {
    if (this.externalRefreshTimer) {
      clearTimeout(this.externalRefreshTimer);
      this.externalRefreshTimer = null;
    }
  }

  private scheduleExternalRefresh(): void {
    if (this.externalRefreshTimer) clearTimeout(this.externalRefreshTimer);
    this.externalRefreshTimer = setTimeout(() => {
      this.externalRefreshTimer = null;
      void this.taskStore.refresh();
    }, EXTERNAL_REFRESH_DEBOUNCE_MS);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_PLANIT)[0];

    if (!leaf) {
      const newLeaf = workspace.getLeaf('tab');
      await newLeaf.setViewState({ type: VIEW_TYPE_PLANIT, active: true });
      leaf = newLeaf;
    }

    workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<PlanitSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
