export const VIEW_TYPE_PLANIT = 'planit-view';

export type Priority = 'none' | 'low' | 'med' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  listId: string;
  tags: string[];

  date: string | null;
  start: string | null;
  end: string | null;

  priority: Priority;
  done: boolean;
  completedAt: number | null;

  description: string;
  subtasks: Subtask[];

  noteRef: string | null;

  createdAt: number;
  updatedAt: number;
}

export interface List {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface TasksFile {
  schemaVersion: number;
  tasks: Task[];
}

export interface ListsFile {
  lists: List[];
}

export interface PlanitSettings {
  defaultListId: string;
  locale: 'ko' | 'en';
}

export const DEFAULT_SETTINGS: PlanitSettings = {
  defaultListId: 'list_inbox',
  locale: 'ko',
};

export const DEFAULT_LISTS: List[] = [
  { id: 'list_inbox', name: 'Inbox', color: '#8A8A8A', order: 0 },
];

export const SCHEMA_VERSION = 1;
