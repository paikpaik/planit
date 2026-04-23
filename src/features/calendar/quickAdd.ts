import type { TaskInput } from '../../core/store';

export type ParsedTime =
  | { kind: 'empty' }
  | { kind: 'ok'; value: string }
  | { kind: 'invalid' };

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export function parseTimeInput(raw: string): ParsedTime {
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'empty' };

  const match = TIME_PATTERN.exec(trimmed);
  if (!match) return { kind: 'invalid' };

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return { kind: 'invalid' };

  const value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  return { kind: 'ok', value };
}

export interface QuickAddParams {
  title: string;
  date: string | null;
  start: string | null;
  end: string | null;
  listId: string;
}

export function buildTaskInput(params: QuickAddParams): TaskInput {
  return {
    title: params.title.trim(),
    listId: params.listId,
    tags: [],
    date: params.date,
    start: params.start,
    end: params.end,
    priority: 'none',
    done: false,
    completedAt: null,
    description: '',
    subtasks: [],
    noteRef: null,
  };
}
