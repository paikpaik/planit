import { generateId } from '../../utils/id';
import type { List, ListsFile } from '../types';

export interface ListPersistence {
  loadLists(): Promise<ListsFile>;
  saveLists(file: ListsFile): Promise<void>;
}

export type ListInput = Omit<List, 'id' | 'order'>;

type Listener = () => void;

const INBOX_ID = 'list_inbox';

export class ListStore {
  private lists: List[] = [];
  private listeners = new Set<Listener>();

  constructor(private persistence: ListPersistence) {}

  async init(): Promise<void> {
    const file = await this.persistence.loadLists();
    this.lists = file.lists;
  }

  getAll(): List[] {
    return this.lists;
  }

  getById(id: string): List | undefined {
    return this.lists.find((l) => l.id === id);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async add(input: ListInput): Promise<List> {
    const maxOrder = this.lists.reduce((acc, l) => Math.max(acc, l.order), -1);
    const list: List = {
      ...input,
      id: generateId('list'),
      order: maxOrder + 1,
    };
    this.lists = [...this.lists, list];
    await this.persist();
    this.notify();
    return list;
  }

  async update(id: string, patch: Partial<ListInput>): Promise<void> {
    const index = this.lists.findIndex((l) => l.id === id);
    if (index === -1) return;
    const merged: List = { ...this.lists[index], ...patch };
    this.lists = [...this.lists.slice(0, index), merged, ...this.lists.slice(index + 1)];
    await this.persist();
    this.notify();
  }

  async remove(id: string): Promise<void> {
    if (id === INBOX_ID) {
      throw new Error('Cannot remove the protected inbox list');
    }
    const next = this.lists.filter((l) => l.id !== id);
    if (next.length === this.lists.length) return;
    this.lists = next;
    await this.persist();
    this.notify();
  }

  async refresh(): Promise<void> {
    const file = await this.persistence.loadLists();
    const prev = JSON.stringify(this.lists);
    const next = JSON.stringify(file.lists);
    this.lists = file.lists;
    if (prev !== next) this.notify();
  }

  private async persist(): Promise<void> {
    await this.persistence.saveLists({ lists: this.lists });
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
