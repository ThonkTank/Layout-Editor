import type { Setting, ToggleComponent } from "obsidian";

export type DomainConfigurationSource = "builtin" | "vault";

const STORAGE_KEY = "layout-editor:domain-source";

const listeners = new Set<(source: DomainConfigurationSource) => void>();

let activeSource: DomainConfigurationSource = loadFromStorage() ?? "builtin";

function loadFromStorage(): DomainConfigurationSource | null {
    try {
        if (typeof window === "undefined" || !window.localStorage) {
            return null;
        }
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored === "vault" || stored === "builtin" ? stored : null;
    } catch (error) {
        console.warn("Layout Editor: konnte gespeicherte Domänenquelle nicht lesen", error);
        return null;
    }
}

function persistSource(source: DomainConfigurationSource) {
    try {
        if (typeof window === "undefined" || !window.localStorage) {
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, source);
    } catch (error) {
        console.warn("Layout Editor: konnte Domänenquelle nicht speichern", error);
    }
}

export function getDomainConfigurationSource(): DomainConfigurationSource {
    return activeSource;
}

export function setDomainConfigurationSource(source: DomainConfigurationSource): void {
    if (activeSource === source) {
        return;
    }
    activeSource = source;
    persistSource(source);
    for (const listener of listeners) {
        listener(source);
    }
}

export function onDomainConfigurationSourceChange(
    listener: (source: DomainConfigurationSource) => void,
): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function renderDomainConfigurationSetting(setting: Setting): () => void {
    let toggleComponent: ToggleComponent | null = null;

    setting
        .setName("Domänenquelle")
        .setDesc(
            "Wähle, ob Layout-Definitionen und Seeds aus den Plug-in-Defaults oder einer JSON-Datei im Vault geladen werden.",
        )
        .addToggle(toggle => {
            toggleComponent = toggle
                .setValue(activeSource === "vault")
                .setTooltip("Vault-Konfiguration aktivieren")
                .onChange(value => {
                    setDomainConfigurationSource(value ? "vault" : "builtin");
                });
        });

    const unsubscribe = onDomainConfigurationSourceChange(source => {
        if (!toggleComponent) {
            return;
        }
        const shouldBeVault = source === "vault";
        if (toggleComponent.getValue() !== shouldBeVault) {
            toggleComponent.setValue(shouldBeVault);
        }
    });

    return () => {
        unsubscribe();
        toggleComponent = null;
    };
}

export function resetDomainConfigurationSourceForTesting(): void {
    activeSource = "builtin";
}
