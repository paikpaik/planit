import type { App, TFile } from 'obsidian';
import { SuggestModal } from 'obsidian';

import { t } from '../../i18n';

export class NotePickerModal extends SuggestModal<TFile> {
  constructor(
    app: App,
    private onPick: (file: TFile) => void,
  ) {
    super(app);
    this.setPlaceholder(t('notePicker.placeholder'));
  }

  getSuggestions(query: string): TFile[] {
    const q = query.toLowerCase();
    return this.app.vault.getMarkdownFiles().filter(
      (f) => f.path.toLowerCase().includes(q),
    );
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createEl('div', { text: file.basename });
    el.createEl('small', { text: file.path, cls: 'planit-note-picker-path' });
  }

  onChooseSuggestion(file: TFile): void {
    this.onPick(file);
  }
}
