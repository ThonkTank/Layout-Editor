import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type LayoutEditorPlugin from "../main";
import { renderDomainConfigurationSetting } from "./domain-settings";

class LayoutEditorSettingsTab extends PluginSettingTab {
    private disposers: Array<() => void> = [];

    constructor(app: App, plugin: LayoutEditorPlugin) {
        super(app, plugin);
    }

    display(): void {
        this.disposeAll();
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Layout Editor" });

        const domainSection = containerEl.createDiv({ cls: "layout-editor-settings" });
        const domainSetting = new Setting(domainSection);
        this.disposers.push(renderDomainConfigurationSetting(domainSetting));
    }

    hide(): void {
        this.disposeAll();
        super.hide();
    }

    private disposeAll(): void {
        while (this.disposers.length > 0) {
            const dispose = this.disposers.pop();
            try {
                dispose?.();
            } catch (error) {
                console.error("Layout Editor: Fehler beim Aufräumen der Settings", error);
            }
        }
    }
}

export function registerLayoutEditorSettingsTab(plugin: LayoutEditorPlugin): void {
    const tab = new LayoutEditorSettingsTab(plugin.app, plugin);
    plugin.addSettingTab(tab);

    plugin.register(() => {
        const settingManager = (plugin.app as App & {
            setting?: {
                removeSettingTab?: (tab: PluginSettingTab) => void;
            };
        }).setting;
        settingManager?.removeSettingTab?.(tab);
    });
}
