import type { WorkspaceLeaf } from 'obsidian';
import { ItemView, Menu, Notice, setIcon } from 'obsidian';

import type { List, Task } from '../../core/types';
import { VIEW_TYPE_PLANIT } from '../../core/types';
import type PlanitPlugin from '../../main';
import { addMonths, formatDateLabel, getMonthMatrix, getUpcomingDates, isSameDay, toISODate } from '../../utils/date';
import { EditTaskModal } from './EditTaskModal';
import { ListEditorModal } from './ListEditorModal';
import { QuickAddModal } from './QuickAddModal';

const WEEKDAY_LABELS_MON_FIRST = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKDAY_LABELS_SUN_FIRST = ['일', '월', '화', '수', '목', '금', '토'];

type SmartView = 'today' | 'upcoming' | 'inbox';

const SMART_VIEW_META: { view: SmartView; label: string; icon: string; empty: string }[] = [
  { view: 'today',    label: '오늘',   icon: 'sun',           empty: '오늘 할 일이 없습니다' },
  { view: 'upcoming', label: '예정',   icon: 'calendar-days', empty: '예정된 일정이 없습니다' },
  { view: 'inbox',    label: 'Inbox',  icon: 'inbox',         empty: '받은 편지함이 비어 있습니다' },
];

export class PlanitView extends ItemView {
  private cursor: Date = new Date();
  private activeListId: string | null = null;
  private smartView: SmartView | null = null;
  private activeTag: string | null = null;
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

    if (this.smartView !== null) {
      this.renderSmartPanel(main);
    } else {
      const scroll = main.createDiv({ cls: 'planit-scroll' });
      this.renderWeekdayHeader(scroll);
      this.renderGrid(scroll);
    }
  }

  private toggleSidebar(): void {
    this.plugin.settings.sidebarExpanded = !this.plugin.settings.sidebarExpanded;
    void this.plugin.saveSettings();
    this.render();
  }

  private renderSidebar(root: HTMLElement): void {
    const sidebar = root.createDiv({ cls: 'planit-sidebar' });

    for (const meta of SMART_VIEW_META) {
      const item = sidebar.createDiv({ cls: 'planit-sidebar-item' });
      if (this.smartView === meta.view) item.addClass('is-active');
      const iconEl = item.createDiv({ cls: 'planit-sidebar-icon' });
      setIcon(iconEl, meta.icon);
      item.createSpan({ cls: 'planit-sidebar-name', text: meta.label });
      const count = this.getSmartCount(meta.view);
      if (count > 0) {
        item.createSpan({ cls: 'planit-sidebar-count', text: String(count) });
      }
      item.addEventListener('click', () => this.selectSmartView(meta.view));
    }

    sidebar.createDiv({ cls: 'planit-sidebar-sep' });
    sidebar.createDiv({ cls: 'planit-sidebar-heading', text: '리스트' });

    const allItem = sidebar.createDiv({ cls: 'planit-sidebar-item' });
    if (this.smartView === null && this.activeListId === null) allItem.addClass('is-active');
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

    const allTags = this.getAllTags();
    if (allTags.length > 0) {
      sidebar.createDiv({ cls: 'planit-sidebar-sep' });
      sidebar.createDiv({ cls: 'planit-sidebar-heading', text: '태그' });
      for (const tag of allTags) {
        const item = sidebar.createDiv({ cls: 'planit-sidebar-item' });
        if (this.activeTag === tag) item.addClass('is-active');
        item.createSpan({ cls: 'planit-sidebar-tag-label', text: `#${tag}` });
        item.addEventListener('click', () => this.selectTag(tag));
      }
    }
  }

  private getAllTags(): string[] {
    const set = new Set<string>();
    for (const task of this.plugin.taskStore.getAll()) {
      for (const tag of task.tags) set.add(tag);
    }
    return [...set].sort();
  }

  private selectTag(tag: string): void {
    this.activeTag = this.activeTag === tag ? null : tag;
    this.render();
  }

  private applyTagFilter(tasks: Task[]): Task[] {
    if (this.activeTag === null) return tasks;
    return tasks.filter((t) => t.tags.includes(this.activeTag!));
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
    this.smartView = null;
    this.activeListId = listId;
    this.render();
  }

  private selectSmartView(view: SmartView): void {
    this.smartView = view;
    this.activeListId = null;
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

    if (this.smartView !== null) {
      const meta = SMART_VIEW_META.find((m) => m.view === this.smartView)!;
      toolbar.createEl('span', { cls: 'planit-toolbar-title', text: meta.label });
      return;
    }

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
        const listFiltered = this.activeListId === null
          ? allTasks
          : allTasks.filter((t) => t.listId === this.activeListId);
        const tasks = this.applyTagFilter(listFiltered);
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

  private getSmartTasksFor(view: SmartView): Task[] {
    const todayIso = toISODate(new Date());
    const all = this.plugin.taskStore.getAll();
    if (view === 'today') return all.filter((t) => t.date === todayIso);
    if (view === 'inbox') return all.filter((t) => t.date === null);
    const upcoming = getUpcomingDates(todayIso, 7);
    return all.filter((t) => t.date !== null && upcoming.includes(t.date));
  }

  private getSmartCount(view: SmartView): number {
    return this.getSmartTasksFor(view).filter((t) => !t.done).length;
  }

  private renderSmartPanel(root: HTMLElement): void {
    const panel = root.createDiv({ cls: 'planit-smart-panel planit-scroll' });
    const view = this.smartView!;
    const tasks = this.applyTagFilter(this.getSmartTasksFor(view));

    if (tasks.length === 0) {
      const meta = SMART_VIEW_META.find((m) => m.view === view)!;
      panel.createDiv({ cls: 'planit-smart-empty', text: meta.empty });
    } else if (view === 'upcoming') {
      const todayIso = toISODate(new Date());
      const byDate = new Map<string, Task[]>();
      for (const t of tasks) {
        const key = t.date!;
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(t);
      }
      const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
      for (const [dateIso, group] of sorted) {
        panel.createDiv({ cls: 'planit-smart-group-header', text: formatDateLabel(dateIso, todayIso) });
        for (const task of group) this.renderSmartRow(panel, task);
      }
    } else {
      for (const task of tasks) this.renderSmartRow(panel, task);
    }

    if (view === 'today' || view === 'inbox') {
      const addBtn = panel.createDiv({ cls: 'planit-smart-add' });
      setIcon(addBtn.createDiv({ cls: 'planit-smart-add-icon' }), 'plus');
      addBtn.createSpan({ text: view === 'inbox' ? 'Inbox에 추가' : '오늘에 추가' });
      addBtn.addEventListener('click', () => {
        const date = view === 'today' ? toISODate(new Date()) : null;
        new QuickAddModal(
          this.app,
          { date, listId: this.plugin.settings.defaultListId, lists: this.plugin.listStore.getAll() },
          async (input) => { await this.plugin.taskStore.add(input); }
        ).open();
      });
    }
  }

  private renderSmartRow(container: HTMLElement, task: Task): void {
    const row = container.createDiv({ cls: 'planit-smart-row' });
    if (task.done) row.addClass('is-done');

    const checkbox = row.createEl('button', {
      cls: 'planit-chip-check',
      attr: { 'aria-label': task.done ? '완료 해제' : '완료 처리' },
    });
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.plugin.taskStore.toggleDone(task.id);
    });

    if (task.priority !== 'none') {
      row.createDiv({ cls: `planit-priority-dot priority-${task.priority}` });
    }

    const body = row.createDiv({ cls: 'planit-smart-row-body' });
    body.createSpan({ cls: 'planit-smart-row-title', text: task.title });
    if (task.start) {
      body.createSpan({ cls: 'planit-smart-row-time', text: task.start });
    }

    const listInfo = this.plugin.listStore.getById(task.listId);
    if (listInfo) {
      const dot = row.createDiv({ cls: 'planit-smart-row-list-dot' });
      dot.style.background = listInfo.color;
    }

    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.planit-chip-check')) return;
      this.openEditTask(task);
    });
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
