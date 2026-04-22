import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';

import type { TaskStore } from '../../core/store';
import type { Task } from '../../core/types';
import { VIEW_TYPE_PLANIT } from '../../core/types';
import type { WeekStart } from '../../utils/date';
import { addMonths, getMonthMatrix, isSameDay, toISODate } from '../../utils/date';

const WEEKDAY_LABELS_MON_FIRST = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKDAY_LABELS_SUN_FIRST = ['일', '월', '화', '수', '목', '금', '토'];
const CHIPS_PER_CELL = 3;

export class PlanitView extends ItemView {
  private cursor: Date = new Date();
  private weekStart: WeekStart = 1;
  private unsubscribe: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, private taskStore: TaskStore) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PLANIT;
  }

  getDisplayText(): string {
    return 'Planit';
  }

  getIcon(): string {
    return 'calendar';
  }

  async onOpen(): Promise<void> {
    const today = new Date();
    this.cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    this.unsubscribe = this.taskStore.subscribe(() => this.render());
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('planit-view');

    this.renderToolbar(root);
    this.renderWeekdayHeader(root);
    this.renderGrid(root);
  }

  private renderToolbar(root: HTMLElement): void {
    const toolbar = root.createDiv({ cls: 'planit-toolbar' });

    const nav = toolbar.createDiv({ cls: 'planit-toolbar-nav' });
    const prev = nav.createEl('button', { cls: 'planit-nav-btn', text: '‹' });
    prev.addEventListener('click', () => this.shiftMonth(-1));

    const title = nav.createEl('span', {
      cls: 'planit-toolbar-title',
      text: `${this.cursor.getFullYear()}년 ${this.cursor.getMonth() + 1}월`,
    });
    title.setAttribute('aria-live', 'polite');

    const next = nav.createEl('button', { cls: 'planit-nav-btn', text: '›' });
    next.addEventListener('click', () => this.shiftMonth(1));

    const today = toolbar.createEl('button', { cls: 'planit-today-btn', text: '오늘' });
    today.addEventListener('click', () => this.goToday());
  }

  private renderWeekdayHeader(root: HTMLElement): void {
    const header = root.createDiv({ cls: 'planit-weekday-header' });
    const labels = this.weekStart === 1 ? WEEKDAY_LABELS_MON_FIRST : WEEKDAY_LABELS_SUN_FIRST;
    for (const label of labels) {
      header.createDiv({ cls: 'planit-weekday', text: label });
    }
  }

  private renderGrid(root: HTMLElement): void {
    const grid = root.createDiv({ cls: 'planit-grid' });
    const matrix = getMonthMatrix(this.cursor.getFullYear(), this.cursor.getMonth(), this.weekStart);
    const today = new Date();
    const currentMonth = this.cursor.getMonth();

    for (const row of matrix) {
      for (const date of row) {
        const cell = grid.createDiv({ cls: 'planit-cell' });
        if (date.getMonth() !== currentMonth) cell.addClass('is-other-month');
        if (isSameDay(date, today)) cell.addClass('is-today');

        cell.createDiv({ cls: 'planit-cell-date', text: String(date.getDate()) });

        const tasks = this.taskStore.getByDate(toISODate(date));
        this.renderCellTasks(cell, tasks);
      }
    }
  }

  private renderCellTasks(cell: HTMLElement, tasks: Task[]): void {
    if (tasks.length === 0) return;
    const list = cell.createDiv({ cls: 'planit-cell-tasks' });
    const visible = tasks.slice(0, CHIPS_PER_CELL);
    for (const task of visible) {
      const chip = list.createDiv({ cls: 'planit-chip' });
      if (task.done) chip.addClass('is-done');
      if (task.start) {
        chip.createSpan({ cls: 'planit-chip-time', text: task.start });
      }
      chip.createSpan({ cls: 'planit-chip-title', text: task.title });
    }
    const overflow = tasks.length - visible.length;
    if (overflow > 0) {
      list.createDiv({ cls: 'planit-chip-overflow', text: `+${overflow}` });
    }
  }

  private shiftMonth(delta: number): void {
    this.cursor = addMonths(this.cursor, delta);
    this.render();
  }

  private goToday(): void {
    const today = new Date();
    this.cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    this.render();
  }
}
