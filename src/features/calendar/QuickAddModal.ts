import type { App } from 'obsidian';
import { Modal, Notice } from 'obsidian';

import type { TaskInput } from '../../core/store';
import type { List } from '../../core/types';
import { t } from '../../i18n';
import { buildTaskInput, parseTimeInput } from './quickAdd';

export interface QuickAddDefaults {
  date: string | null;
  listId: string;
  lists: List[];
  start?: string;
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

    contentEl.createEl('h3', { text: t('quickAdd.heading'), cls: 'planit-quick-add-title' });
    contentEl.createEl('p', {
      text: this.defaults.date ?? t('quickAdd.noDate'),
      cls: 'planit-quick-add-date',
    });

    const titleInput = contentEl.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-input',
      attr: { placeholder: t('quickAdd.titlePlaceholder'), autofocus: 'true' },
    });

    const timeRow = contentEl.createDiv({ cls: 'planit-quick-add-time-row' });
    const startInput = timeRow.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-time',
      attr: { placeholder: 'HH:mm', 'aria-label': t('quickAdd.startAriaLabel') },
    }) as HTMLInputElement;
    if (this.defaults.start) startInput.value = this.defaults.start;
    timeRow.createSpan({ cls: 'planit-quick-add-time-sep', text: '—' });
    const endInput = timeRow.createEl('input', {
      type: 'text',
      cls: 'planit-quick-add-time',
      attr: { placeholder: 'HH:mm', 'aria-label': t('quickAdd.endAriaLabel') },
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
    const cancelBtn = actions.createEl('button', { text: t('btn.cancel') });
    const saveBtn = actions.createEl('button', { text: t('btn.save'), cls: 'mod-cta' });

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
        new Notice(t('error.startTime'));
        startInput.focus();
        return;
      }

      const endParsed = parseTimeInput(endInput.value);
      if (endParsed.kind === 'invalid') {
        new Notice(t('error.endTime'));
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
