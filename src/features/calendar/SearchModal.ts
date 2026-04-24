import type { App } from 'obsidian';
import { Modal, setIcon } from 'obsidian';

import type { List, Task } from '../../core/types';
import { searchTasks } from './searchTasks';

export class SearchModal extends Modal {
  private selectedIndex = 0;
  private results: Task[] = [];
  private resultEls: HTMLElement[] = [];

  constructor(
    app: App,
    private tasks: Task[],
    private lists: List[],
    private onSelect: (task: Task) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('planit-search');

    const inputWrap = contentEl.createDiv({ cls: 'planit-search-input-wrap' });
    const searchIcon = inputWrap.createDiv({ cls: 'planit-search-icon' });
    setIcon(searchIcon, 'search');

    const input = inputWrap.createEl('input', {
      cls: 'planit-search-input',
      attr: { placeholder: '태스크 검색...', type: 'text' },
    }) as HTMLInputElement;

    const resultList = contentEl.createDiv({ cls: 'planit-search-results' });

    const render = (): void => {
      resultList.empty();
      this.resultEls = [];

      if (this.results.length === 0) {
        const empty = resultList.createDiv({ cls: 'planit-search-empty' });
        empty.textContent = input.value.trim() ? '일치하는 태스크가 없습니다' : '제목, 설명, 태그로 검색하세요';
        return;
      }

      for (let i = 0; i < this.results.length; i++) {
        const task = this.results[i];
        const row = resultList.createDiv({ cls: 'planit-search-row' });
        if (i === this.selectedIndex) row.addClass('is-selected');
        this.resultEls.push(row);

        if (task.priority !== 'none') {
          row.createDiv({ cls: `planit-priority-dot priority-${task.priority}` });
        }

        const body = row.createDiv({ cls: 'planit-search-row-body' });
        body.createSpan({ cls: 'planit-search-row-title', text: task.title });

        if (task.date) {
          body.createSpan({ cls: 'planit-search-row-date', text: task.date });
        } else {
          body.createSpan({ cls: 'planit-search-row-date', text: 'Inbox' });
        }

        const list = this.lists.find((l) => l.id === task.listId);
        if (list) {
          const dot = row.createDiv({ cls: 'planit-search-row-list-dot' });
          dot.style.background = list.color;
        }

        const idx = i;
        row.addEventListener('mouseenter', () => {
          this.selectedIndex = idx;
          this.highlightSelected();
        });
        row.addEventListener('click', () => this.confirm());
      }
    };

    const runSearch = (): void => {
      this.results = searchTasks(this.tasks, input.value);
      this.selectedIndex = 0;
      render();
    };

    input.addEventListener('input', runSearch);

    input.addEventListener('keydown', (e) => {
      if (this.results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
        this.highlightSelected();
        this.resultEls[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlightSelected();
        this.resultEls[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      }
    });

    // 초기 상태: 빈 안내 메시지
    render();
    setTimeout(() => input.focus(), 0);
  }

  private highlightSelected(): void {
    this.resultEls.forEach((el, i) => {
      el.toggleClass('is-selected', i === this.selectedIndex);
    });
  }

  private confirm(): void {
    const task = this.results[this.selectedIndex];
    if (!task) return;
    this.close();
    this.onSelect(task);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
