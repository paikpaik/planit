import type { Task } from '../../core/types';

export function searchTasks(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  return tasks.filter((t) => {
    if (t.title.toLowerCase().includes(q)) return true;
    if (t.description.toLowerCase().includes(q)) return true;
    if (t.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
    return false;
  });
}
