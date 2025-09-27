// plugins/layout-editor/src/main.ts
import { Plugin, WorkspaceLeaf } from "obsidian";
import { LayoutEditorView, VIEW_LAYOUT_EDITOR } from "./view";
import {
    DEFAULT_ELEMENT_DEFINITIONS,
    getElementDefinitions,
    onLayoutElementDefinitionsChanged,
    registerLayoutElementDefinition as registerElementDefinition,
    resetLayoutElementDefinitions,
    unregisterLayoutElementDefinition as unregisterElementDefinition,
} from "./definitions";
import { listSavedLayouts, loadSavedLayout, saveLayoutToLibrary, type VersionedSavedLayout } from "./layout-library";
import {
    getViewBinding,
    getViewBindingIds,
    getViewBindings,
    getViewBindingsByTag,
    hasViewBinding,
    onViewBindingsChanged,
    registerViewBinding as registerView,
    resetViewBindings as resetViewRegistry,
    unregisterViewBinding as unregisterView,
    type LayoutViewBindingDefinition,
} from "./view-registry";
import type { LayoutBlueprint, LayoutElementDefinition, LayoutElementType } from "./types";
import { LAYOUT_EDITOR_CSS } from "./css";
import { ensureSeedLayouts } from "./seed-layouts";
import { onDomainConfigurationSourceChange } from "./settings/domain-settings";
import { registerLayoutEditorSettingsTab } from "./settings/settings-tab";

export const LAYOUT_EDITOR_API_VERSION = "1.0.0";

type SemVerTuple = [number, number, number];

function parseVersionTuple(version: string): SemVerTuple {
    const [major, minor, patch] = version
        .split(".")
        .slice(0, 3)
        .map(part => part.replace(/[^0-9]/g, ""));
    const toNumber = (value: string | undefined) => {
        const numeric = Number.parseInt(value ?? "0", 10);
        return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    };
    return [toNumber(major), toNumber(minor), toNumber(patch)];
}

function compareVersions(current: SemVerTuple, minimum: SemVerTuple): number {
    for (let index = 0; index < 3; index += 1) {
        if (current[index] > minimum[index]) return 1;
        if (current[index] < minimum[index]) return -1;
    }
    return 0;
}

export interface LayoutEditorApiCompatibility {
    readonly apiVersion: string;
    isAtLeast(version: string): boolean;
    assertMinimum(version: string, featureName?: string): void;
    withMinimum<T>(version: string, feature: () => T): T | undefined;
}

export function createLayoutEditorApiCompatibility(version: string): LayoutEditorApiCompatibility {
    const normalized = parseVersionTuple(version);
    const normalizedVersion = `${normalized[0]}.${normalized[1]}.${normalized[2]}`;

    const isAtLeast = (candidate: string): boolean => {
        const minimum = parseVersionTuple(candidate);
        return compareVersions(normalized, minimum) >= 0;
    };

    const assertMinimum = (candidate: string, featureName?: string) => {
        if (!isAtLeast(candidate)) {
            const requirement = `${candidate}`;
            const detail = featureName ? ` für ${featureName}` : "";
            throw new Error(
                `Layout Editor API Version ${requirement}${detail} wird benötigt, aktuell ist ${normalizedVersion}.`,
            );
        }
    };

    const withMinimum = <T>(candidate: string, feature: () => T): T | undefined => {
        if (!isAtLeast(candidate)) {
            return undefined;
        }
        return feature();
    };

    return {
        apiVersion: normalizedVersion,
        isAtLeast,
        assertMinimum,
        withMinimum,
    };
}

export interface LayoutEditorPluginApi {
    apiVersion: string;
    isApiVersionAtLeast(version: string): boolean;
    assertApiVersion(version: string, featureName?: string): void;
    withMinimumApiVersion<T>(version: string, feature: () => T): T | undefined;
    viewType: string;
    openView(): Promise<void>;
    registerElementDefinition(definition: LayoutElementDefinition): void;
    unregisterElementDefinition(type: LayoutElementType): void;
    resetElementDefinitions(definitions?: LayoutElementDefinition[]): void;
    getElementDefinitions(): LayoutElementDefinition[];
    onDefinitionsChanged(listener: (definitions: LayoutElementDefinition[]) => void): () => void;
    saveLayout(payload: LayoutBlueprint & { name: string; id?: string }): Promise<VersionedSavedLayout>;
    listLayouts(): Promise<VersionedSavedLayout[]>;
    loadLayout(id: string): Promise<VersionedSavedLayout | null>;
    registerViewBinding(definition: LayoutViewBindingDefinition): void;
    unregisterViewBinding(id: string): void;
    resetViewBindings(definitions?: LayoutViewBindingDefinition[]): void;
    getViewBindings(): LayoutViewBindingDefinition[];
    getViewBinding(id: string): LayoutViewBindingDefinition | undefined;
    hasViewBinding(id: string): boolean;
    getViewBindingIds(): string[];
    getViewBindingsByTag(tag: string): LayoutViewBindingDefinition[];
    onViewBindingsChanged(listener: (bindings: LayoutViewBindingDefinition[]) => void): () => void;
}

export default class LayoutEditorPlugin extends Plugin {
    private api!: LayoutEditorPluginApi;

    async onload() {
        resetLayoutElementDefinitions(DEFAULT_ELEMENT_DEFINITIONS);

        await ensureSeedLayouts(this.app);

        const unsubscribeDomainSource = onDomainConfigurationSourceChange(() => {
            void ensureSeedLayouts(this.app);
        });
        this.register(unsubscribeDomainSource);

        this.registerView(VIEW_LAYOUT_EDITOR, (leaf: WorkspaceLeaf) => new LayoutEditorView(leaf));

        this.addRibbonIcon("layout-grid", "Layout Editor öffnen", () => {
            void this.openView();
        });

        this.addCommand({
            id: "open-layout-editor",
            name: "Layout Editor öffnen",
            callback: () => this.openView(),
        });

        registerLayoutEditorSettingsTab(this);

        this.injectCss();

        const compatibility = createLayoutEditorApiCompatibility(LAYOUT_EDITOR_API_VERSION);

        this.api = {
            apiVersion: compatibility.apiVersion,
            isApiVersionAtLeast: compatibility.isAtLeast,
            assertApiVersion: compatibility.assertMinimum,
            withMinimumApiVersion: compatibility.withMinimum,
            viewType: VIEW_LAYOUT_EDITOR,
            openView: () => this.openView(),
            registerElementDefinition,
            unregisterElementDefinition,
            resetElementDefinitions: definitions => {
                if (definitions && definitions.length) {
                    resetLayoutElementDefinitions(definitions);
                } else {
                    resetLayoutElementDefinitions(DEFAULT_ELEMENT_DEFINITIONS);
                }
            },
            getElementDefinitions,
            onDefinitionsChanged: listener => onLayoutElementDefinitionsChanged(listener),
            saveLayout: payload => saveLayoutToLibrary(this.app, payload),
            listLayouts: () => listSavedLayouts(this.app),
            loadLayout: id => loadSavedLayout(this.app, id),
            registerViewBinding: registerView,
            unregisterViewBinding: unregisterView,
            resetViewBindings: definitions => {
                resetViewRegistry(definitions ?? []);
            },
            getViewBindings,
            getViewBinding,
            hasViewBinding,
            getViewBindingIds,
            getViewBindingsByTag,
            onViewBindingsChanged: listener => onViewBindingsChanged(listener),
        };
    }

    onunload() {
        resetLayoutElementDefinitions(DEFAULT_ELEMENT_DEFINITIONS);
        resetViewRegistry();
        this.removeCss();
    }

    getApi(): LayoutEditorPluginApi {
        return this.api;
    }

    private async openView(): Promise<void> {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({ type: VIEW_LAYOUT_EDITOR, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    private injectCss() {
        const style = document.createElement("style");
        style.id = "layout-editor-css";
        style.textContent = LAYOUT_EDITOR_CSS;
        document.head.appendChild(style);
        this.register(() => style.remove());
    }

    private removeCss() {
        document.getElementById("layout-editor-css")?.remove();
    }
}
