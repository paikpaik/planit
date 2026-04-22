import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';

import type { Task } from '../../core/types';
import { VIEW_TYPE_PLANIT } from '../../core/types';
import type PlanitPlugin from '../../main';
import type { WeekStart } from '../../utils/date';
import { addMonths, getMonthMatrix, isSameDay, toISODate } from '../../utils/date';
import { EditTaskModal } from './EditTaskModal';
import { QuickAddModal } from './QuickAddModal';

const WEEKDAY_LABELS_MON_FIRST = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKDAY_LABELS_SUN_FIRST = ['일', '월', '화', '수', '목', '금', '토'];
const CHIPS_PER_CELL = 3;

export class PlanitView extends ItemView {
  private cursor: Date = new Date();
  private weekStart: WeekStart = 1;
  private unsubscribe: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: PlanitPlugin) {
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
    this.unsubscribe = this.plugin.taskStore.subscribe(() => this.render());
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

        const iso = toISODate(date);
        const tasks = this.plugin.taskStore.getByDate(iso);
        this.renderCellTasks(cell, tasks);

        cell.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.planit-chip')) return;
          this.openQuickAdd(iso);
        });
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

      const checkbox = chip.createEl('button', {
        cls: 'planit-chip-check',
        attr: { 'aria-label': task.done ? '완료 해제' : '완료 처리' },
      });
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.plugin.taskStore.toggleDone(task.id);
      });

      const body = chip.createDiv({ cls: 'planit-chip-body' });
      if (task.start) {
        body.createSpan({ cls: 'planit-chip-time', text: task.start });
      }
      body.createSpan({ cls: 'planit-chip-title', text: task.title });

      body.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditTask(task);
      });
    }
    const overflow = tasks.length - visible.length;
    if (overflow > 0) {
      list.createDiv({ cls: 'planit-chip-overflow', text: `+${overflow}` });
    }
  }

  private openEditTask(task: Task): void {
    const modal = new EditTaskModal(
      this.app,
      task,
      this.plugin.lists.lists,
      {
        onSave: async (patch) => {
          await this.plugin.taskStore.update(task.id, patch);
        },
        onDelete: async () => {
          await this.plugin.taskStore.remove(task.id);
        },
      }
    );
    modal.open();
  }

  private openQuickAdd(date: string): void {
    const modal = new QuickAddModal(
      this.app,
      {
        date,
        listId: this.plugin.settings.defaultListId,
        lists: this.plugin.lists.lists,
      },
      async (input) => {
        await this.plugin.taskStore.add(input);
      }
    );
    modal.open();
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
