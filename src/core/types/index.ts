export const VIEW_TYPE_PLANIT = 'planit-view';

export type WeekStart = 0 | 1;

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
  recurrence: RecurrenceRule | null;

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

export type RecurrenceRule =
  | { type: 'daily' }
  | { type: 'weekly';  days: number[] }        // days: 0=일 ~ 6=토, 복수 선택
  | { type: 'monthly'; day: number }           // day: 1~31
  | { type: 'nweekly'; n: number; day: number }; // 매 n주마다 특정 요일

export type CalView = 'month' | 'week' | 'day';

export interface PlanitSettings {
  defaultListId: string;
  weekStart: WeekStart;
  locale: 'ko' | 'en';
  sidebarExpanded: boolean;
  defaultView: CalView;
}

export const DEFAULT_SETTINGS: PlanitSettings = {
  defaultListId: 'list_inbox',
  weekStart: 1,
  locale: 'ko',
  sidebarExpanded: false,
  defaultView: 'month',
};

export const DEFAULT_LISTS: List[] = [
  { id: 'list_inbox', name: 'Inbox', color: '#8A8A8A', order: 0 },
];

export const SCHEMA_VERSION = 1;
