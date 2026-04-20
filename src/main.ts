import { Plugin } from 'obsidian';

import { StorageService } from './core/storage';
import type { ListsFile, PlanitSettings, TasksFile } from './core/types';
import { DEFAULT_SETTINGS, VIEW_TYPE_PLANIT } from './core/types';
import { PlanitView } from './features/calendar/PlanitView';

export default class PlanitPlugin extends Plugin {
  settings!: PlanitSettings;
  storage!: StorageService;
  tasks!: TasksFile;
  lists!: ListsFile;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.storage = new StorageService(this.app);
    this.tasks = await this.storage.loadTasks();
    this.lists = await this.storage.loadLists();

    this.registerView(VIEW_TYPE_PLANIT, (leaf) => new PlanitView(leaf));

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
  }

  async onunload(): Promise<void> {
    // no-op for now
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
