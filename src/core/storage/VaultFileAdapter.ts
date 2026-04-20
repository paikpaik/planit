import type { App } from 'obsidian';

export class VaultFileAdapter {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private app: App) {}

  async exists(path: string): Promise<boolean> {
    return this.app.vault.adapter.exists(path);
  }

  async read(path: string): Promise<string> {
    return this.app.vault.adapter.read(path);
  }

  async write(path: string, content: string): Promise<void> {
    await this.ensureParentFolder(path);
    this.writeQueue = this.writeQueue
      .then(() => this.app.vault.adapter.write(path, content))
      .catch(() => {
        // prevent queue from getting stuck
      });
    await this.writeQueue;
  }

  async delete(path: string): Promise<void> {
    if (await this.exists(path)) {
      await this.app.vault.adapter.remove(path);
    }
  }

  private async ensureParentFolder(path: string): Promise<void> {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) return;
    const parent = path.slice(0, lastSlash);
    if (await this.exists(parent)) return;
    await this.app.vault.adapter.mkdir(parent);
  }
}
