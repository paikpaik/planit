import type { WorkspaceLeaf } from 'obsidian';
import { ItemView, Menu, Notice, setIcon } from 'obsidian';

import type { List, Task } from '../../core/types';
import { VIEW_TYPE_PLANIT } from '../../core/types';
import type PlanitPlugin from '../../main';
import { addMonths, getMonthMatrix, isSameDay, toISODate } from '../../utils/date';
import { EditTaskModal } from './EditTaskModal';
import { ListEditorModal } from './ListEditorModal';
import { QuickAddModal } from './QuickAddModal';

const WEEKDAY_LABELS_MON_FIRST = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKDAY_LABELS_SUN_FIRST = ['일', '월', '화', '수', '목', '금', '토'];

export class PlanitView extends ItemView {
  private cursor: Date = new Date();
  private activeListId: string | null = null;
  private unsubscribeTasks: (() => void) | null = null;
  private unsubscribeLists: (() => void) | null = null;

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
    this.unsubscribeTasks = this.plugin.taskStore.subscribe(() => this.render());
    this.unsubscribeLists = this.plugin.listStore.subscribe(() => this.render());
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribeTasks?.();
    this.unsubscribeLists?.();
    this.unsubscribeTasks = null;
    this.unsubscribeLists = null;
  }

  refresh(): void {
    this.render();
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('planit-view');

    if (this.plugin.settings.sidebarExpanded) {
      this.renderSidebar(root);
    }

    const main = root.createDiv({ cls: 'planit-main' });
    this.renderToolbar(main);

    const scroll = main.createDiv({ cls: 'planit-scroll' });
    this.renderWeekdayHeader(scroll);
    this.renderGrid(scroll);
  }

  private toggleSidebar(): void {
    this.plugin.settings.sidebarExpanded = !this.plugin.settings.sidebarExpanded;
    void this.plugin.saveSettings();
    this.render();
  }

  private renderSidebar(root: HTMLElement): void {
    const sidebar = root.createDiv({ cls: 'planit-sidebar' });
    sidebar.createDiv({ cls: 'planit-sidebar-heading', text: '리스트' });

    const allItem = sidebar.createDiv({ cls: 'planit-sidebar-item' });
    if (this.activeListId === null) allItem.addClass('is-active');
    allItem.createDiv({ cls: 'planit-sidebar-dot planit-sidebar-dot-all' });
    allItem.createSpan({ cls: 'planit-sidebar-name', text: '전체' });
    allItem.addEventListener('click', () => this.selectList(null));

    const lists = [...this.plugin.listStore.getAll()].sort((a, b) => a.order - b.order);
    for (const list of lists) {
      this.renderSidebarItem(sidebar, list);
    }

    const addBtn = sidebar.createDiv({ cls: 'planit-sidebar-add' });
    addBtn.createSpan({ cls: 'planit-sidebar-add-icon', text: '+' });
    addBtn.createSpan({ cls: 'planit-sidebar-add-label', text: '새 리스트' });
    addBtn.addEventListener('click', () => this.openCreateList());
  }

  private renderSidebarItem(sidebar: HTMLElement, list: List): void {
    const item = sidebar.createDiv({ cls: 'planit-sidebar-item' });
    if (this.activeListId === list.id) item.addClass('is-active');
    const dot = item.createDiv({ cls: 'planit-sidebar-dot' });
    dot.style.background = list.color;
    item.createSpan({ cls: 'planit-sidebar-name', text: list.name });

    const menuBtn = item.createEl('button', {
      cls: 'planit-sidebar-menu-btn',
      text: '⋮',
      attr: { 'aria-label': '리스트 메뉴' },
    });
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openListMenu(e, list);
    });

    item.addEventListener('click', () => this.selectList(list.id));
  }

  private selectList(listId: string | null): void {
    this.activeListId = listId;
    this.render();
  }

  private openCreateList(): void {
    const modal = new ListEditorModal(this.app, 'create', null, {
      onSave: async (input) => {
        await this.plugin.listStore.add(input);
      },
    });
    modal.open();
  }

  private openListMenu(e: MouseEvent, list: List): void {
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle('편집')
        .setIcon('pencil')
        .onClick(() => this.openEditList(list))
    );
    const isInbox = list.id === 'list_inbox';
    menu.addItem((item) =>
      item
        .setTitle('삭제')
        .setIcon('trash')
        .setDisabled(isInbox)
        .onClick(() => {
          if (isInbox) return;
          void this.deleteList(list);
        })
    );
    menu.showAtMouseEvent(e);
  }

  private openEditList(list: List): void {
    const modal = new ListEditorModal(this.app, 'edit', list, {
      onSave: async (input) => {
        await this.plugin.listStore.update(list.id, input);
      },
    });
    modal.open();
  }

  private async deleteList(list: List): Promise<void> {
    const tasksInList = this.plugin.taskStore
      .getAll()
      .filter((t) => t.listId === list.id);
    if (tasksInList.length > 0) {
      const proceed = window.confirm(
        `"${list.name}"에 ${tasksInList.length}개 태스크가 있습니다. 삭제하면 태스크가 Inbox로 이동합니다. 계속할까요?`
      );
      if (!proceed) return;
      for (const t of tasksInList) {
        await this.plugin.taskStore.update(t.id, { listId: 'list_inbox' });
      }
    }
    try {
      await this.plugin.listStore.remove(list.id);
      if (this.activeListId === list.id) this.activeListId = null;
    } catch (err) {
      new Notice(`리스트 삭제 실패: ${(err as Error).message}`);
    }
  }

  private renderToolbar(root: HTMLElement): void {
    const toolbar = root.createDiv({ cls: 'planit-toolbar' });

    const toggleBtn = toolbar.createEl('button', {
      cls: 'planit-sidebar-toggle',
      attr: {
        'aria-label': this.plugin.settings.sidebarExpanded ? '리스트 접기' : '리스트 펼치기',
      },
    });
    setIcon(toggleBtn, this.plugin.settings.sidebarExpanded ? 'panel-left-close' : 'panel-left');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());

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
    const labels = this.plugin.settings.weekStart === 1 ? WEEKDAY_LABELS_MON_FIRST : WEEKDAY_LABELS_SUN_FIRST;
    for (const label of labels) {
      header.createDiv({ cls: 'planit-weekday', text: label });
    }
  }

  private renderGrid(root: HTMLElement): void {
    const grid = root.createDiv({ cls: 'planit-grid' });
    const matrix = getMonthMatrix(this.cursor.getFullYear(), this.cursor.getMonth(), this.plugin.settings.weekStart);
    const today = new Date();
    const currentMonth = this.cursor.getMonth();

    for (const row of matrix) {
      for (const date of row) {
        const cell = grid.createDiv({ cls: 'planit-cell' });
        if (date.getMonth() !== currentMonth) cell.addClass('is-other-month');
        if (isSameDay(date, today)) cell.addClass('is-today');

        cell.createDiv({ cls: 'planit-cell-date', text: String(date.getDate()) });

        const iso = toISODate(date);
        const allTasks = this.plugin.taskStore.getByDate(iso);
        const tasks = this.activeListId === null
          ? allTasks
          : allTasks.filter((t) => t.listId === this.activeListId);
        this.renderCellTasks(cell, tasks);

        cell.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.planit-chip')) return;
          this.openQuickAdd(iso);
        });

        this.wireCellDrop(cell, iso);
      }
    }
  }

  private wireCellDrop(cell: HTMLElement, iso: string): void {
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      cell.addClass('is-drop-target');
    });
    cell.addEventListener('dragleave', (e) => {
      // dragleave fires when entering child elements too; only clear when leaving the cell
      if (e.relatedTarget && cell.contains(e.relatedTarget as Node)) return;
      cell.removeClass('is-drop-target');
    });
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.removeClass('is-drop-target');
      const taskId = e.dataTransfer?.getData('text/plain');
      if (!taskId) return;
      const task = this.plugin.taskStore.getAll().find((t) => t.id === taskId);
      if (!task || task.date === iso) return;
      void this.plugin.taskStore.update(taskId, { date: iso });
    });
  }

  private renderCellTasks(cell: HTMLElement, tasks: Task[]): void {
    if (tasks.length === 0) return;
    const list = cell.createDiv({ cls: 'planit-cell-tasks' });
    for (const task of tasks) {
      const chip = list.createDiv({ cls: 'planit-chip' });
      chip.draggable = true;
      if (task.done) chip.addClass('is-done');
      const chipList = this.plugin.listStore.getById(task.listId);
      if (chipList) chip.style.borderLeft = `3px solid ${chipList.color}`;

      chip.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }
        chip.addClass('is-dragging');
      });
      chip.addEventListener('dragend', () => {
        chip.removeClass('is-dragging');
      });

      const checkbox = chip.createEl('button', {
        cls: 'planit-chip-check',
        attr: { 'aria-label': task.done ? '완료 해제' : '완료 처리' },
      });
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.plugin.taskStore.toggleDone(task.id);
      });

      if (task.priority !== 'none') {
        chip.createDiv({ cls: `planit-priority-dot priority-${task.priority}` });
      }

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
  }

  private openEditTask(task: Task): void {
    const modal = new EditTaskModal(
      this.app,
      task,
      this.plugin.listStore.getAll(),
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
        lists: this.plugin.listStore.getAll(),
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
