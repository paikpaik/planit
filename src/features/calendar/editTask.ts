import type { TaskInput } from '../../core/store';
import type { Priority } from '../../core/types';

export interface EditTaskFormValues {
  title: string;
  date: string | null;
  start: string | null;
  end: string | null;
  listId: string;
  priority: Priority;
  description: string;
  tags: string[];
}

export function buildTaskPatch(values: EditTaskFormValues): Partial<TaskInput> {
  return {
    title: values.title.trim(),
    listId: values.listId,
    date: values.date,
    start: values.start,
    end: values.end,
    priority: values.priority,
    description: values.description,
    tags: values.tags,
  };
}
