import type { App } from 'obsidian';
import { Modal, Notice } from 'obsidian';

import type { TaskInput } from '../../core/store';
import type { List } from '../../core/types';
import { buildTaskInput, parseTimeInput } from './quickAdd';

export interface QuickAddDefaults {
  date: string | null;
  listId: string;
  lists: List[];
}

export class QuickAddModal extends Modal {
  constructor(
    app: App,
    private defaults: QuickAddDefaults,
    private onSave: (input: TaskInput) => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('planit-quick-add');

    contentEl.createEl('h3', { text: '태스크 추가', cls: 'planit-quick-add-title' });
    contentEl.createEl('p', {
      text: this.defaults.date ?? '날짜 없음 (Inbox)',
      cls: 'planit-quick-add-date',
    });

    const titleInput = contentEl.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-input',
      attr: { placeholder: '제목', autofocus: 'true' },
    });

    const timeRow = contentEl.createDiv({ cls: 'planit-quick-add-time-row' });
    const startInput = timeRow.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-time',
      attr: { placeholder: 'HH:mm', 'aria-label': '시작 시간' },
    });
    timeRow.createSpan({ cls: 'planit-quick-add-time-sep', text: '—' });
    const endInput = timeRow.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-time',
      attr: { placeholder: 'HH:mm', 'aria-label': '종료 시간' },
    });

    const listSelect = contentEl.createEl('select', { cls: 'planit-quick-add-list' });
    for (const list of this.defaults.lists) {
      const opt = listSelect.createEl('option', {
        value: list.id,
        text: list.name,
      }) as HTMLOptionElement;
      if (list.id === this.defaults.listId) opt.selected = true;
    }

    const actions = contentEl.createDiv({ cls: 'planit-quick-add-actions' });
    const cancelBtn = actions.createEl('button', { text: '취소' });
    const saveBtn = actions.createEl('button', { text: '저장', cls: 'mod-cta' });

    let submitting = false;
    const submit = async (): Promise<void> => {
      if (submitting) return;
      const title = titleInput.value.trim();
      if (title === '') {
        titleInput.focus();
        return;
      }

      const startParsed = parseTimeInput(startInput.value);
      if (startParsed.kind === 'invalid') {
        new Notice('시작 시간 형식이 올바르지 않습니다 (HH:mm)');
        startInput.focus();
        return;
      }

      const endParsed = parseTimeInput(endInput.value);
      if (endParsed.kind === 'invalid') {
        new Notice('종료 시간 형식이 올바르지 않습니다 (HH:mm)');
        endInput.focus();
        return;
      }

      const input = buildTaskInput({
        title,
        date: this.defaults.date,
        start: startParsed.kind === 'ok' ? startParsed.value : null,
        end: endParsed.kind === 'ok' ? endParsed.value : null,
        listId: listSelect.value,
      });

      submitting = true;
      try {
        await this.onSave(input);
      } finally {
        submitting = false;
      }
      this.close();
    };

    const handleEnter = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        void submit();
      }
    };
    titleInput.addEventListener('keydown', handleEnter);
    startInput.addEventListener('keydown', handleEnter);
    endInput.addEventListener('keydown', handleEnter);

    saveBtn.addEventListener('click', () => void submit());
    cancelBtn.addEventListener('click', () => this.close());

    setTimeout(() => titleInput.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
