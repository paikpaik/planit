import type { EventRef } from 'obsidian';
import { Notice, Plugin } from 'obsidian';

import { StorageService } from './core/storage';
import { ListStore, TaskStore } from './core/store';
import type { PlanitSettings } from './core/types';
import { DEFAULT_SETTINGS, VIEW_TYPE_PLANIT } from './core/types';
import { PlanitView } from './features/calendar/PlanitView';
import { PlanitSettingTab } from './features/settings/PlanitSettingTab';
import { toISODate } from './utils/date';

const TASKS_FILE_PATH = '.planit/tasks.json';
const LISTS_FILE_PATH = '.planit/lists.json';
const EXTERNAL_REFRESH_DEBOUNCE_MS = 100;

export default class PlanitPlugin extends Plugin {
  settings!: PlanitSettings;
  storage!: StorageService;
  taskStore!: TaskStore;
  listStore!: ListStore;
  private externalRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private externalListsRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.storage = new StorageService(this.app);
    this.taskStore = new TaskStore(this.storage);
    this.listStore = new ListStore(this.storage);
    await this.taskStore.init();
    await this.listStore.init();

    this.registerView(VIEW_TYPE_PLANIT, (leaf) => new PlanitView(leaf, this));
    this.addSettingTab(new PlanitSettingTab(this.app, this));

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
        if (path === TASKS_FILE_PATH) this.scheduleExternalRefresh();
        else if (path === LISTS_FILE_PATH) this.scheduleExternalListsRefresh();
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
    if (this.externalListsRefreshTimer) {
      clearTimeout(this.externalListsRefreshTimer);
      this.externalListsRefreshTimer = null;
    }
  }

  private scheduleExternalRefresh(): void {
    if (this.externalRefreshTimer) clearTimeout(this.externalRefreshTimer);
    this.externalRefreshTimer = setTimeout(() => {
      this.externalRefreshTimer = null;
      void this.taskStore.refresh();
    }, EXTERNAL_REFRESH_DEBOUNCE_MS);
  }

  private scheduleExternalListsRefresh(): void {
    if (this.externalListsRefreshTimer) clearTimeout(this.externalListsRefreshTimer);
    this.externalListsRefreshTimer = setTimeout(() => {
      this.externalListsRefreshTimer = null;
      void this.listStore.refresh();
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

  refreshViews(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_PLANIT).forEach((leaf) => {
      (leaf.view as PlanitView).refresh();
    });
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<PlanitSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
