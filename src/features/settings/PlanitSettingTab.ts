import { type App, PluginSettingTab, Setting } from 'obsidian';

import { setLocale, t } from '../../i18n';
import type PlanitPlugin from '../../main';

export class PlanitSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PlanitPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t('settings.defaultView'))
      .setDesc(t('settings.defaultViewDesc'))
      .addDropdown((drop) =>
        drop
          .addOption('month', t('toolbar.month'))
          .addOption('week', t('toolbar.week'))
          .addOption('day', t('toolbar.day'))
          .setValue(this.plugin.settings.defaultView)
          .onChange(async (value) => {
            this.plugin.settings.defaultView = value as 'month' | 'week' | 'day';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t('settings.weekStart'))
      .setDesc(t('settings.weekStartDesc'))
      .addDropdown((drop) =>
        drop
          .addOption('1', t('settings.monday'))
          .addOption('0', t('settings.sunday'))
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
      .setName(t('settings.defaultList'))
      .setDesc(t('settings.defaultListDesc'))
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
      .setName(t('settings.language'))
      .setDesc(t('settings.languageDesc'))
      .addDropdown((drop) =>
        drop
          .addOption('ko', t('settings.korean'))
          .addOption('en', 'English')
          .setValue(this.plugin.settings.locale)
          .onChange(async (value) => {
            this.plugin.settings.locale = value as 'ko' | 'en';
            await this.plugin.saveSettings();
            setLocale(this.plugin.settings.locale);
            this.plugin.refreshViews();
            // 설정 패널도 즉시 새로고침
            this.display();
          })
      );

    new Setting(containerEl)
      .setName(t('settings.sidebar'))
      .setDesc(t('settings.sidebarDesc'))
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
