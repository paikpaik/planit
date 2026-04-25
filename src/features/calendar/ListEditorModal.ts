import type { App } from 'obsidian';
import { Modal } from 'obsidian';

import type { ListInput } from '../../core/store';
import type { List } from '../../core/types';
import { t } from '../../i18n';

const DEFAULT_COLOR = '#2C7EF8';

export interface ListEditorCallbacks {
  onSave: (input: ListInput) => Promise<void>;
}

export class ListEditorModal extends Modal {
  constructor(
    app: App,
    private mode: 'create' | 'edit',
    private initial: List | null,
    private callbacks: ListEditorCallbacks
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('planit-list-editor');

    contentEl.createEl('h3', {
      text: this.mode === 'create' ? t('listEditor.createTitle') : t('listEditor.editTitle'),
      cls: 'planit-list-editor-heading',
    });

    const nameInput = contentEl.createEl('input', {
      type: 'text',
      cls: 'planit-list-editor-input',
      attr: { placeholder: t('listEditor.namePlaceholder') },
    }) as HTMLInputElement;
    nameInput.value = this.initial?.name ?? '';

    const colorRow = contentEl.createDiv({ cls: 'planit-list-editor-row' });
    colorRow.createEl('label', { text: t('listEditor.colorLabel'), cls: 'planit-list-editor-label' });
    const colorInput = colorRow.createEl('input', {
      type: 'color',
      cls: 'planit-list-editor-color',
    }) as HTMLInputElement;
    colorInput.value = this.initial?.color ?? DEFAULT_COLOR;

    const actions = contentEl.createDiv({ cls: 'planit-list-editor-actions' });
    const cancelBtn = actions.createEl('button', { text: t('btn.cancel') });
    const saveBtn = actions.createEl('button', { text: t('btn.save'), cls: 'mod-cta' });

    let submitting = false;
    const submit = async (): Promise<void> => {
      if (submitting) return;
      const name = nameInput.value.trim();
      if (name === '') {
        nameInput.focus();
        return;
      }
      submitting = true;
      try {
        await this.callbacks.onSave({ name, color: colorInput.value });
      } finally {
        submitting = false;
      }
      this.close();
    };

    saveBtn.addEventListener('click', () => void submit());
    cancelBtn.addEventListener('click', () => this.close());
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        void submit();
      }
    });

    setTimeout(() => nameInput.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
