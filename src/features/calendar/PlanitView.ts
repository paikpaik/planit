import type { WorkspaceLeaf } from 'obsidian';
import { ItemView, Menu, Notice, setIcon } from 'obsidian';

import type { List, Task } from '../../core/types';
import { VIEW_TYPE_PLANIT } from '../../core/types';
import { formatDayFull, formatWeekRange, formatYearMonth, t, weekdayShort } from '../../i18n';
import type PlanitPlugin from '../../main';
import { addMonths, formatDateLabel, getMonthMatrix, getUpcomingDates, getWeekStart, isSameDay, toISODate } from '../../utils/date';
import { EditTaskModal } from './EditTaskModal';
import { ListEditorModal } from './ListEditorModal';
import { QuickAddModal } from './QuickAddModal';
import { SearchModal } from './SearchModal';

type SmartView = 'today' | 'upcoming' | 'inbox' | 'note';

function getSmartViewMeta(): { view: SmartView; label: string; icon: string; empty: string }[] {
  return [
    { view: 'today',    label: t('smartView.today'),    icon: 'sun',           empty: t('smartView.todayEmpty') },
    { view: 'upcoming', label: t('smartView.upcoming'), icon: 'calendar-days', empty: t('smartView.upcomingEmpty') },
    { view: 'inbox',    label: 'Inbox',                 icon: 'inbox',         empty: t('smartView.inboxEmpty') },
  ];
}

export class PlanitView extends ItemView {
  private cursor: Date = new Date();
  private viewMode: 'month' | 'week' | 'day' = this.plugin.settings.defaultView;
  private activeListId: string | null = null;
  private smartView: SmartView | null = null;
  private activeTag: string | null = null;
  private activeNoteRef: string | null = null;
  private unsubscribeTasks: (() => void) | null = null;
  private unsubscribeLists: (() => void) | null = null;
  private isDragging = false;

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

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        const file = this.app.workspace.getActiveFile();
        const newRef = file?.path ?? null;
        if (newRef !== this.activeNoteRef) {
          this.activeNoteRef = newRef;
          this.render();
        }
      }),
    );

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
    if (this.isDragging) return;
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
    } else if (this.viewMode === 'week') {
      this.renderWeekView(main);
    } else if (this.viewMode === 'day') {
      this.renderDayView(main);
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

    for (const meta of getSmartViewMeta()) {
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

    if (this.activeNoteRef !== null) {
      const noteName = this.activeNoteRef.replace(/\.md$/, '').split('/').pop() ?? this.activeNoteRef;
      const noteItem = sidebar.createDiv({ cls: 'planit-sidebar-item' });
      if (this.smartView === 'note') noteItem.addClass('is-active');
      const noteIcon = noteItem.createDiv({ cls: 'planit-sidebar-icon' });
      setIcon(noteIcon, 'file-text');
      noteItem.createSpan({ cls: 'planit-sidebar-name', text: noteName });
      const noteCount = this.plugin.taskStore.getAll().filter((t) => t.noteRef === this.activeNoteRef).length;
      if (noteCount > 0) {
        noteItem.createSpan({ cls: 'planit-sidebar-count', text: String(noteCount) });
      }
      noteItem.addEventListener('click', () => this.selectSmartView('note'));
    }

    sidebar.createDiv({ cls: 'planit-sidebar-sep' });
    sidebar.createDiv({ cls: 'planit-sidebar-heading', text: t('sidebar.lists') });

    const allItem = sidebar.createDiv({ cls: 'planit-sidebar-item' });
    if (this.smartView === null && this.activeListId === null) allItem.addClass('is-active');
    allItem.createDiv({ cls: 'planit-sidebar-dot planit-sidebar-dot-all' });
    allItem.createSpan({ cls: 'planit-sidebar-name', text: t('sidebar.allLists') });
    allItem.addEventListener('click', () => this.selectList(null));

    const lists = [...this.plugin.listStore.getAll()].sort((a, b) => a.order - b.order);
    for (const list of lists) {
      this.renderSidebarItem(sidebar, list);
    }

    const addBtn = sidebar.createDiv({ cls: 'planit-sidebar-add' });
    addBtn.createSpan({ cls: 'planit-sidebar-add-icon', text: '+' });
    addBtn.createSpan({ cls: 'planit-sidebar-add-label', text: t('sidebar.newList') });
    addBtn.addEventListener('click', () => this.openCreateList());

    const allTags = this.getAllTags();
    if (allTags.length > 0) {
      sidebar.createDiv({ cls: 'planit-sidebar-sep' });
      sidebar.createDiv({ cls: 'planit-sidebar-heading', text: t('sidebar.tags') });
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
      attr: { 'aria-label': t('sidebar.listMenu') },
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
        .setTitle(t('list.edit'))
        .setIcon('pencil')
        .onClick(() => this.openEditList(list))
    );
    const isInbox = list.id === 'list_inbox';
    menu.addItem((item) =>
      item
        .setTitle(t('list.delete'))
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
        t('list.deleteConfirm', { name: list.name, count: tasksInList.length })
      );
      if (!proceed) return;
      for (const task of tasksInList) {
        await this.plugin.taskStore.update(task.id, { listId: 'list_inbox' });
      }
    }
    try {
      await this.plugin.listStore.remove(list.id);
      if (this.activeListId === list.id) this.activeListId = null;
    } catch (err) {
      new Notice(t('list.deleteError', { msg: (err as Error).message }));
    }
  }

  private renderToolbar(root: HTMLElement): void {
    const toolbar = root.createDiv({ cls: 'planit-toolbar' });

    const toggleBtn = toolbar.createEl('button', {
      cls: 'planit-sidebar-toggle',
      attr: {
        'aria-label': this.plugin.settings.sidebarExpanded ? t('sidebar.close') : t('sidebar.open'),
      },
    });
    setIcon(toggleBtn, this.plugin.settings.sidebarExpanded ? 'panel-left-close' : 'panel-left');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());

    if (this.smartView !== null) {
      let titleText: string;
      if (this.smartView === 'note' && this.activeNoteRef) {
        titleText = this.activeNoteRef.replace(/\.md$/, '').split('/').pop() ?? this.activeNoteRef;
      } else {
        titleText = getSmartViewMeta().find((m) => m.view === this.smartView)?.label ?? '';
      }
      toolbar.createEl('span', { cls: 'planit-toolbar-title', text: titleText });
      const sb = toolbar.createEl('button', {
        cls: 'planit-search-btn',
        attr: { 'aria-label': t('toolbar.search'), style: 'margin-left:auto' },
      });
      setIcon(sb, 'search');
      sb.addEventListener('click', () => this.openSearch());
      return;
    }

    const nav = toolbar.createDiv({ cls: 'planit-toolbar-nav' });
    const prev = nav.createEl('button', { cls: 'planit-nav-btn', text: '‹' });
    prev.addEventListener('click', () => {
      if (this.viewMode === 'week') this.shiftWeek(-1);
      else if (this.viewMode === 'day') this.shiftDay(-1);
      else this.shiftMonth(-1);
    });

    let titleText: string;
    if (this.viewMode === 'week') titleText = this.getWeekLabel();
    else if (this.viewMode === 'day') titleText = this.getDayLabel();
    else titleText = formatYearMonth(this.cursor.getFullYear(), this.cursor.getMonth() + 1);

    const title = nav.createEl('span', { cls: 'planit-toolbar-title', text: titleText });
    title.setAttribute('aria-live', 'polite');

    const next = nav.createEl('button', { cls: 'planit-nav-btn', text: '›' });
    next.addEventListener('click', () => {
      if (this.viewMode === 'week') this.shiftWeek(1);
      else if (this.viewMode === 'day') this.shiftDay(1);
      else this.shiftMonth(1);
    });

    const today = toolbar.createEl('button', { cls: 'planit-today-btn', text: t('toolbar.today') });
    today.addEventListener('click', () => this.goToday());

    const searchBtn = toolbar.createEl('button', {
      cls: 'planit-search-btn',
      attr: { 'aria-label': t('toolbar.search') },
    });
    setIcon(searchBtn, 'search');
    searchBtn.addEventListener('click', () => this.openSearch());

    const viewToggle = toolbar.createDiv({ cls: 'planit-view-toggle' });

    const monthBtn = viewToggle.createEl('button', {
      cls: 'planit-view-toggle-btn',
      text: t('toolbar.month'),
      attr: { 'aria-label': t('toolbar.monthAriaLabel') },
    });
    if (this.viewMode === 'month') monthBtn.addClass('is-active');
    monthBtn.addEventListener('click', () => this.setViewMode('month'));

    const weekBtn = viewToggle.createEl('button', {
      cls: 'planit-view-toggle-btn',
      text: t('toolbar.week'),
      attr: { 'aria-label': t('toolbar.weekAriaLabel') },
    });
    if (this.viewMode === 'week') weekBtn.addClass('is-active');
    weekBtn.addEventListener('click', () => this.setViewMode('week'));

    const dayBtn = viewToggle.createEl('button', {
      cls: 'planit-view-toggle-btn',
      text: t('toolbar.day'),
      attr: { 'aria-label': t('toolbar.dayAriaLabel') },
    });
    if (this.viewMode === 'day') dayBtn.addClass('is-active');
    dayBtn.addEventListener('click', () => this.setViewMode('day'));
  }

  private renderWeekdayHeader(root: HTMLElement): void {
    const header = root.createDiv({ cls: 'planit-weekday-header' });
    const wd = weekdayShort();
    const labels = this.plugin.settings.weekStart === 1
      ? [wd[1], wd[2], wd[3], wd[4], wd[5], wd[6], wd[0]]
      : [...wd];
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
          : allTasks.filter((task) => task.listId === this.activeListId);
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
      if (e.relatedTarget && cell.contains(e.relatedTarget as Node)) return;
      cell.removeClass('is-drop-target');
    });
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.removeClass('is-drop-target');
      const taskId = e.dataTransfer?.getData('text/plain');
      if (!taskId) return;
      const task = this.plugin.taskStore.getAll().find((task) => task.id === taskId);
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
        attr: { 'aria-label': task.done ? t('task.undone') : t('task.done') },
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
      if (task.recurrence !== null) {
        const recIcon = body.createSpan({ cls: 'planit-chip-recurrence' });
        setIcon(recIcon, 'repeat-2');
      }

      body.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditTask(task);
      });
    }
  }

  openSearch(): void {
    const modal = new SearchModal(
      this.app,
      this.plugin.taskStore.getAll(),
      this.plugin.listStore.getAll(),
      (task) => this.openTask(task),
    );
    modal.open();
  }

  openTask(task: Task): void {
    this.smartView = null;
    if (task.date) {
      const [y, m, d] = task.date.split('-').map(Number);
      if (this.viewMode === 'day') {
        this.cursor = new Date(y, m - 1, d);
      } else {
        this.cursor = new Date(y, m - 1, 1);
        this.viewMode = 'month';
      }
    }
    this.render();
    this.openEditTask(task);
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

  private openQuickAdd(date: string, start?: string): void {
    const modal = new QuickAddModal(
      this.app,
      {
        date,
        listId: this.plugin.settings.defaultListId,
        lists: this.plugin.listStore.getAll(),
        start,
      },
      async (input) => {
        await this.plugin.taskStore.add(input);
      }
    );
    modal.open();
  }

  private layoutTimedTasks(tasks: Task[]): Array<{ task: Task; startMin: number; endMin: number; col: number; totalCols: number }> {
    const items = tasks.map((task) => {
      const [hh, mm] = task.start!.split(':').map(Number);
      const startMin = hh * 60 + mm;
      let endMin = startMin + 60;
      if (task.end) {
        const [eh, em] = task.end.split(':').map(Number);
        if (eh * 60 + em > startMin) endMin = eh * 60 + em;
      }
      return { task, startMin, endMin, col: 0, totalCols: 1 };
    });

    items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

    const laneEnds: number[] = [];
    for (const item of items) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMin);
      } else {
        laneEnds[lane] = item.endMin;
      }
      item.col = lane;
    }

    const overlaps = (a: typeof items[0], b: typeof items[0]) =>
      a.startMin < b.endMin && b.startMin < a.endMin;

    const visited = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      if (visited.has(i)) continue;
      const group: number[] = [];
      const queue = [i];
      while (queue.length > 0) {
        const idx = queue.shift()!;
        if (visited.has(idx)) continue;
        visited.add(idx);
        group.push(idx);
        for (let j = 0; j < items.length; j++) {
          if (!visited.has(j) && overlaps(items[idx], items[j])) queue.push(j);
        }
      }
      const gi = group.map((idx) => items[idx]);
      const timePoints = [...new Set(gi.flatMap((it) => [it.startMin, it.endMin]))].sort((a, b) => a - b);
      let maxConcurrent = 1;
      for (const tp of timePoints) {
        const count = gi.filter((it) => it.startMin <= tp && it.endMin > tp).length;
        if (count > maxConcurrent) maxConcurrent = count;
      }
      for (const idx of group) items[idx].totalCols = maxConcurrent;
    }

    return items;
  }

  private renderDayView(root: HTMLElement): void {
    const HOUR_H = 60;
    const toHHmm = (min: number): string => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const wd = weekdayShort();
    const iso = toISODate(this.cursor);
    const allTasks = this.plugin.taskStore.getByDate(iso);
    const listFiltered = this.activeListId === null
      ? allTasks
      : allTasks.filter((task) => task.listId === this.activeListId);
    const tasks = this.applyTagFilter(listFiltered);
    const timedTasks = tasks.filter((task) => task.start !== null);
    const allDayTasks = tasks.filter((task) => task.start === null);

    const dayHeader = root.createDiv({ cls: 'planit-day-header' });
    const today = new Date();
    if (isSameDay(this.cursor, today)) dayHeader.addClass('is-today');
    dayHeader.createSpan({ cls: 'planit-day-header-dow', text: wd[this.cursor.getDay()] });
    dayHeader.createSpan({ cls: 'planit-day-header-date', text: String(this.cursor.getDate()) });

    if (allDayTasks.length > 0) {
      const allDaySection = root.createDiv({ cls: 'planit-day-allday' });
      allDaySection.createDiv({ cls: 'planit-day-allday-label', text: t('dayView.allDay') });
      const chips = allDaySection.createDiv({ cls: 'planit-day-allday-chips' });
      for (const task of allDayTasks) {
        const chip = chips.createDiv({ cls: 'planit-chip' });
        if (task.done) chip.addClass('is-done');
        const chipList = this.plugin.listStore.getById(task.listId);
        if (chipList) chip.style.borderLeft = `3px solid ${chipList.color}`;
        const checkbox = chip.createEl('button', {
          cls: 'planit-chip-check',
          attr: { 'aria-label': task.done ? t('task.undone') : t('task.done') },
        });
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          void this.plugin.taskStore.toggleDone(task.id);
        });
        if (task.priority !== 'none') {
          chip.createDiv({ cls: `planit-priority-dot priority-${task.priority}` });
        }
        const body = chip.createDiv({ cls: 'planit-chip-body' });
        body.createSpan({ cls: 'planit-chip-title', text: task.title });
        if (task.recurrence !== null) {
          setIcon(body.createSpan({ cls: 'planit-chip-recurrence' }), 'repeat-2');
        }
        body.addEventListener('click', (e) => { e.stopPropagation(); this.openEditTask(task); });
      }
    }

    const scroll = root.createDiv({ cls: 'planit-day-scroll planit-scroll' });
    const grid = scroll.createDiv({ cls: 'planit-day-grid' });
    grid.style.height = `${24 * HOUR_H}px`;

    for (let h = 0; h < 24; h++) {
      const row = grid.createDiv({ cls: 'planit-day-hour-row' });
      row.style.top = `${h * HOUR_H}px`;
      row.style.height = `${HOUR_H}px`;
      row.createDiv({
        cls: 'planit-day-hour-label',
        text: h === 0 ? '' : `${String(h).padStart(2, '0')}:00`,
      });
      row.addEventListener('click', () => {
        this.openQuickAdd(iso, `${String(h).padStart(2, '0')}:00`);
      });
    }

    const eventsLayer = grid.createDiv({ cls: 'planit-day-events-layer' });
    eventsLayer.style.height = `${24 * HOUR_H}px`;

    const layouts = this.layoutTimedTasks(timedTasks);
    for (const { task, startMin, endMin, col, totalCols } of layouts) {
      const durationMin = endMin - startMin;
      const blockHeight = Math.max(28, durationMin * HOUR_H / 60);
      const pct = 100 / totalCols;

      const block = eventsLayer.createDiv({ cls: 'planit-day-block' });
      if (task.done) block.addClass('is-done');
      block.style.top = `${startMin * HOUR_H / 60}px`;
      block.style.height = `${blockHeight}px`;
      block.style.left = `${col * pct}%`;
      block.style.width = `calc(${pct}% - 4px)`;

      const blockList = this.plugin.listStore.getById(task.listId);
      if (blockList) {
        block.style.borderLeftColor = blockList.color;
        block.style.background = `${blockList.color}18`;
      }

      const checkbox = block.createEl('button', {
        cls: 'planit-chip-check',
        attr: { 'aria-label': task.done ? t('task.undone') : t('task.done') },
      });
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.plugin.taskStore.toggleDone(task.id);
      });
      if (task.priority !== 'none') {
        block.createDiv({ cls: `planit-priority-dot priority-${task.priority}` });
      }
      block.createSpan({ cls: 'planit-day-block-time', text: task.start! });
      block.createSpan({ cls: 'planit-day-block-title', text: task.title });
      if (task.recurrence !== null) {
        setIcon(block.createSpan({ cls: 'planit-chip-recurrence' }), 'repeat-2');
      }
      block.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.planit-chip-check')) return;
        if ((e.target as HTMLElement).closest('.planit-day-block-resize')) return;
        this.openEditTask(task);
      });

      // ── resize handle ──
      const resizeHandle = block.createDiv({ cls: 'planit-day-block-resize' });
      let origY = 0;
      let resizing = false;

      resizeHandle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizeHandle.setPointerCapture(e.pointerId);
        origY = e.clientY;
        resizing = true;
        this.isDragging = true;
        block.addClass('is-resizing');
        document.body.style.cursor = 'ns-resize';
      });

      resizeHandle.addEventListener('pointermove', (e) => {
        if (!resizing) return;
        const dy = e.clientY - origY;
        // HOUR_H=60 → 1px = 1min; snap to 15min boundary
        const newEndMin = Math.max(startMin + 15, Math.min(1440, Math.round((endMin + dy) / 15) * 15));
        block.style.height = `${Math.max(15, (newEndMin - startMin) * HOUR_H / 60)}px`;
      });

      resizeHandle.addEventListener('pointerup', async (e) => {
        if (!resizing) return;
        resizing = false;
        block.removeClass('is-resizing');
        document.body.style.cursor = '';

        const dy = e.clientY - origY;
        const newEndMin = Math.max(startMin + 15, Math.min(1440, Math.round((endMin + dy) / 15) * 15));
        const newEnd = toHHmm(newEndMin);

        this.isDragging = false;
        if (newEnd !== (task.end ?? toHHmm(endMin))) {
          await this.plugin.taskStore.update(task.id, { end: newEnd });
        }
      });

      resizeHandle.addEventListener('pointercancel', () => {
        if (!resizing) return;
        resizing = false;
        block.removeClass('is-resizing');
        document.body.style.cursor = '';
        block.style.height = `${blockHeight}px`;
        this.isDragging = false;
      });
    }

    const todayIso = toISODate(today);
    if (iso === todayIso) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const nowLine = grid.createDiv({ cls: 'planit-day-now' });
      nowLine.style.top = `${nowMin * HOUR_H / 60}px`;
    }

    setTimeout(() => {
      const scrollTo = iso === todayIso
        ? Math.max(0, (new Date().getHours() - 1) * HOUR_H)
        : 8 * HOUR_H;
      scroll.scrollTop = scrollTo;
    }, 0);
  }

  private getSmartTasksFor(view: SmartView): Task[] {
    const todayIso = toISODate(new Date());
    const all = this.plugin.taskStore.getAll();
    if (view === 'today') return all.filter((task) => task.date === todayIso);
    if (view === 'inbox') return all.filter((task) => task.date === null);
    if (view === 'note') return all.filter((task) => task.noteRef === this.activeNoteRef);
    const upcoming = getUpcomingDates(todayIso, 7);
    return all.filter((task) => task.date !== null && upcoming.includes(task.date));
  }

  private getSmartCount(view: SmartView): number {
    return this.getSmartTasksFor(view).filter((task) => !task.done).length;
  }

  private renderSmartPanel(root: HTMLElement): void {
    const panel = root.createDiv({ cls: 'planit-smart-panel planit-scroll' });
    const view = this.smartView!;
    const tasks = this.applyTagFilter(this.getSmartTasksFor(view));

    if (tasks.length === 0) {
      const emptyMsg = view === 'note'
        ? t('smartView.noteEmpty')
        : (getSmartViewMeta().find((m) => m.view === view)?.empty ?? '');
      panel.createDiv({ cls: 'planit-smart-empty', text: emptyMsg });
    } else if (view === 'upcoming') {
      const todayIso = toISODate(new Date());
      const byDate = new Map<string, Task[]>();
      for (const task of tasks) {
        const key = task.date!;
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(task);
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
      addBtn.createSpan({ text: view === 'inbox' ? t('smartView.addToInbox') : t('smartView.addToToday') });
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
      attr: { 'aria-label': task.done ? t('task.undone') : t('task.done') },
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
    if (task.recurrence !== null) {
      const recIcon = body.createSpan({ cls: 'planit-chip-recurrence' });
      setIcon(recIcon, 'repeat-2');
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

  private setViewMode(mode: 'month' | 'week' | 'day'): void {
    if (this.viewMode === mode) return;
    const today = new Date();
    if (mode === 'week') {
      this.cursor = getWeekStart(today, this.plugin.settings.weekStart);
    } else if (mode === 'day') {
      this.cursor = today;
    } else {
      this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth(), 1);
    }
    this.viewMode = mode;
    this.render();
  }

  private shiftWeek(delta: number): void {
    this.cursor = new Date(
      this.cursor.getFullYear(),
      this.cursor.getMonth(),
      this.cursor.getDate() + delta * 7,
    );
    this.render();
  }

  private getWeekLabel(): string {
    const first = this.cursor;
    const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
    return formatWeekRange(
      first.getFullYear(),
      first.getMonth() + 1, first.getDate(),
      last.getMonth() + 1, last.getDate(),
    );
  }

  private renderWeekView(root: HTMLElement): void {
    const today = new Date();
    const wd = weekdayShort();
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      new Date(this.cursor.getFullYear(), this.cursor.getMonth(), this.cursor.getDate() + i)
    );

    const grid = root.createDiv({ cls: 'planit-week-grid' });

    for (const date of weekDates) {
      const col = grid.createDiv({ cls: 'planit-week-col' });
      if (isSameDay(date, today)) col.addClass('is-today');

      const header = col.createDiv({ cls: 'planit-week-col-header' });
      header.createDiv({ cls: 'planit-week-col-dow', text: wd[date.getDay()] });
      header.createDiv({ cls: 'planit-week-col-date', text: String(date.getDate()) });

      const iso = toISODate(date);
      const allTasks = this.plugin.taskStore.getByDate(iso);
      const listFiltered = this.activeListId === null
        ? allTasks
        : allTasks.filter((task) => task.listId === this.activeListId);
      const tasks = this.applyTagFilter(listFiltered);

      const taskArea = col.createDiv({ cls: 'planit-week-col-tasks' });
      for (const task of tasks) {
        const chip = taskArea.createDiv({ cls: 'planit-chip' });
        if (task.done) chip.addClass('is-done');
        const chipList = this.plugin.listStore.getById(task.listId);
        if (chipList) chip.style.borderLeft = `3px solid ${chipList.color}`;

        const checkbox = chip.createEl('button', {
          cls: 'planit-chip-check',
          attr: { 'aria-label': task.done ? t('task.undone') : t('task.done') },
        });
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          void this.plugin.taskStore.toggleDone(task.id);
        });

        if (task.priority !== 'none') {
          chip.createDiv({ cls: `planit-priority-dot priority-${task.priority}` });
        }

        const body = chip.createDiv({ cls: 'planit-chip-body' });
        if (task.start) body.createSpan({ cls: 'planit-chip-time', text: task.start });
        body.createSpan({ cls: 'planit-chip-title', text: task.title });
        if (task.recurrence !== null) {
          const recIcon = body.createSpan({ cls: 'planit-chip-recurrence' });
          setIcon(recIcon, 'repeat-2');
        }
        body.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEditTask(task);
        });
      }

      taskArea.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.planit-chip')) return;
        this.openQuickAdd(iso);
      });
    }
  }

  private shiftMonth(delta: number): void {
    this.cursor = addMonths(this.cursor, delta);
    this.render();
  }

  private shiftDay(delta: number): void {
    this.cursor = new Date(
      this.cursor.getFullYear(),
      this.cursor.getMonth(),
      this.cursor.getDate() + delta,
    );
    this.render();
  }

  private getDayLabel(): string {
    const d = this.cursor;
    return formatDayFull(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getDay());
  }

  private goToday(): void {
    const today = new Date();
    if (this.viewMode === 'week') {
      this.cursor = getWeekStart(today, this.plugin.settings.weekStart);
    } else if (this.viewMode === 'day') {
      this.cursor = today;
    } else {
      this.cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    this.render();
  }
}
