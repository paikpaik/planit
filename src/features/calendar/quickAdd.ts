import type { TaskInput } from '../../core/store';

export type ParsedTime =
  | { kind: 'empty' }
  | { kind: 'ok'; value: string }
  | { kind: 'invalid' };

const TIME_COLON   = /^(\d{1,2}):(\d{2})$/;
const TIME_COMPACT = /^(\d{2})(\d{2})$/;   // "1400" → "14:00"

export function parseTimeInput(raw: string): ParsedTime {
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'empty' };

  let hh: number;
  let mm: number;

  const colonMatch = TIME_COLON.exec(trimmed);
  if (colonMatch) {
    hh = Number(colonMatch[1]);
    mm = Number(colonMatch[2]);
  } else {
    const compactMatch = TIME_COMPACT.exec(trimmed);
    if (!compactMatch) return { kind: 'invalid' };
    hh = Number(compactMatch[1]);
    mm = Number(compactMatch[2]);
  }

  if (hh > 23 || mm > 59) return { kind: 'invalid' };
  return { kind: 'ok', value: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` };
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
    recurrence: null,
  };
}
