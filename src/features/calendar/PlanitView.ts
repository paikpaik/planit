import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';

import { VIEW_TYPE_PLANIT } from '../../core/types';

export class PlanitView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
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
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('planit-view');
    container.createEl('h2', { text: 'Planit', cls: 'planit-title' });
    container.createEl('p', {
      text: '캘린더 뷰 준비 중입니다.',
      cls: 'planit-placeholder',
    });
  }

  async onClose(): Promise<void> {
    // no-op for now
  }
}
