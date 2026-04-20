// Minimal Obsidian API mock for Planit tests.

export class Plugin {
  app: any;
  manifest: any;

  constructor(app?: any, manifest?: any) {
    this.app = app;
    this.manifest = manifest;
  }

  addRibbonIcon = jest.fn();
  addCommand = jest.fn();
  addSettingTab = jest.fn();
  registerView = jest.fn();
  loadData = jest.fn().mockResolvedValue({});
  saveData = jest.fn().mockResolvedValue(undefined);
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: any = {
    empty: jest.fn(),
    createEl: jest.fn().mockReturnValue({ createEl: jest.fn(), createDiv: jest.fn() }),
    createDiv: jest.fn().mockReturnValue({ createEl: jest.fn(), createDiv: jest.fn() }),
  };

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }

  display() {}
}

export class ItemView {
  app: any;
  leaf: any;
  containerEl: any = {
    children: [
      {},
      {
        empty: jest.fn(),
        addClass: jest.fn(),
        createEl: jest.fn().mockReturnValue({
          addEventListener: jest.fn(),
          setAttribute: jest.fn(),
        }),
        createDiv: jest.fn().mockReturnValue({
          createEl: jest.fn(),
          createDiv: jest.fn(),
        }),
      },
    ],
  };

  constructor(leaf: any) {
    this.leaf = leaf;
  }

  getViewType(): string {
    return '';
  }

  getDisplayText(): string {
    return '';
  }

  getIcon(): string {
    return '';
  }
}

export class WorkspaceLeaf {}

export class App {
  vault: any = {
    adapter: {
      basePath: '/mock/vault/path',
      exists: jest.fn().mockResolvedValue(false),
      read: jest.fn().mockResolvedValue(''),
      write: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
    },
  };
  workspace: any = {
    getLeavesOfType: jest.fn().mockReturnValue([]),
    getLeaf: jest.fn().mockReturnValue({
      setViewState: jest.fn().mockResolvedValue(undefined),
    }),
    revealLeaf: jest.fn(),
  };
}

export const Notice = jest.fn().mockImplementation((_message: string, _timeout?: number) => {});
