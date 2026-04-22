import { generateId } from '../../utils/id';
import type { Task, TasksFile } from '../types';
import { SCHEMA_VERSION } from '../types';

export interface TaskPersistence {
  loadTasks(): Promise<TasksFile>;
  saveTasks(file: TasksFile): Promise<void>;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

type Listener = () => void;

export class TaskStore {
  private tasks: Task[] = [];
  private listeners = new Set<Listener>();

  constructor(private persistence: TaskPersistence) {}

  async init(): Promise<void> {
    const file = await this.persistence.loadTasks();
    this.tasks = file.tasks;
  }

  getAll(): Task[] {
    return this.tasks;
  }

  getByDate(iso: string): Task[] {
    const matches = this.tasks.filter((t) => t.date === iso);
    return matches.sort(compareByStart);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async add(input: TaskInput): Promise<Task> {
    const now = Date.now();
    const task: Task = {
      ...input,
      id: generateId('tsk'),
      createdAt: now,
      updatedAt: now,
    };
    this.tasks = [...this.tasks, task];
    await this.persist();
    this.notify();
    return task;
  }

  async update(id: string, patch: Partial<TaskInput>): Promise<void> {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    const merged: Task = {
      ...this.tasks[index],
      ...patch,
      updatedAt: Date.now(),
    };
    this.tasks = [...this.tasks.slice(0, index), merged, ...this.tasks.slice(index + 1)];
    await this.persist();
    this.notify();
  }

  async refresh(): Promise<void> {
    const file = await this.persistence.loadTasks();
    const prev = JSON.stringify(this.tasks);
    const next = JSON.stringify(file.tasks);
    this.tasks = file.tasks;
    if (prev !== next) this.notify();
  }

  async toggleDone(id: string): Promise<void> {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    const current = this.tasks[index];
    const nowTs = Date.now();
    const merged: Task = {
      ...current,
      done: !current.done,
      completedAt: current.done ? null : nowTs,
      updatedAt: nowTs,
    };
    this.tasks = [...this.tasks.slice(0, index), merged, ...this.tasks.slice(index + 1)];
    await this.persist();
    this.notify();
  }

  async remove(id: string): Promise<void> {
    const next = this.tasks.filter((t) => t.id !== id);
    if (next.length === this.tasks.length) return;
    this.tasks = next;
    await this.persist();
    this.notify();
  }

  private async persist(): Promise<void> {
    await this.persistence.saveTasks({ schemaVersion: SCHEMA_VERSION, tasks: this.tasks });
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

function compareByStart(a: Task, b: Task): number {
  if (a.start === b.start) return 0;
  if (a.start === null) return 1;
  if (b.start === null) return -1;
  return a.start < b.start ? -1 : 1;
}
