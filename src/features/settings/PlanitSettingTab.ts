import { type App, PluginSettingTab, Setting } from 'obsidian';

import type PlanitPlugin from '../../main';

export class PlanitSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PlanitPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('주 시작일')
      .setDesc('캘린더 그리드의 첫 번째 요일을 설정합니다.')
      .addDropdown((drop) =>
        drop
          .addOption('1', '월요일')
          .addOption('0', '일요일')
          .setValue(String(this.plugin.settings.weekStart))
          .onChange(async (value) => {
            this.plugin.settings.weekStart = Number(value) as 0 | 1;
            await this.plugin.saveSettings();
            this.plugin.refreshViews();
          })
      );

    const lists = this.plugin.listStore.getAll();
    const listOptions = Object.fromEntries(lists.map((l) => [l.id, l.name]));

    new Setting(containerEl)
      .setName('기본 리스트')
      .setDesc('새 태스크를 추가할 때 기본으로 선택되는 리스트입니다.')
      .addDropdown((drop) =>
        drop
          .addOptions(listOptions)
          .setValue(this.plugin.settings.defaultListId)
          .onChange(async (value) => {
            this.plugin.settings.defaultListId = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('언어')
      .setDesc('UI 표시 언어를 설정합니다. (전체 i18n 지원은 추후 예정)')
      .addDropdown((drop) =>
        drop
          .addOption('ko', '한국어')
          .addOption('en', 'English')
          .setValue(this.plugin.settings.locale)
          .onChange(async (value) => {
            this.plugin.settings.locale = value as 'ko' | 'en';
            await this.plugin.saveSettings();
            this.plugin.refreshViews();
          })
      );

    new Setting(containerEl)
      .setName('사이드바 기본 펼침')
      .setDesc('Planit을 열 때 리스트 사이드바를 기본으로 펼쳐둡니다.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.sidebarExpanded)
          .onChange(async (value) => {
            this.plugin.settings.sidebarExpanded = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
