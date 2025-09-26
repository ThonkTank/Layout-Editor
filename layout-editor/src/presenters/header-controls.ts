// src/presenters/header-controls.ts
import { Notice, App } from "obsidian";
import {
    createElementsButton,
    createElementsField,
    createElementsHeading,
    createElementsInput,
    createElementsStatus,
    ensureFieldLabelFor,
} from "../elements/ui";
import { ElementPickerModal } from "../element-picker-modal";
import { LayoutEditorStore, LayoutEditorStoreEvent } from "../state/layout-editor-store";
import { LayoutElementDefinition } from "../types";
import { clamp, cloneLayoutElement } from "../utils";
import { listSavedLayouts, loadSavedLayout, saveLayoutToLibrary } from "../layout-library";
import { NameInputModal } from "../name-input-modal";
import { LayoutPickerModal } from "../layout-picker-modal";
import { getElementTypeLabel } from "../definitions";

interface HeaderControlsOptions {
    host: HTMLElement;
    store: LayoutEditorStore;
    app: App;
}

export class HeaderControlsPresenter {
    private readonly store: LayoutEditorStore;
    private readonly app: App;
    private definitions: LayoutElementDefinition[] = [];
    private addElementHost: HTMLElement | null = null;
    private widthInput?: HTMLInputElement;
    private heightInput?: HTMLInputElement;
    private statusEl?: HTMLElement;
    private exportEl?: HTMLTextAreaElement;
    private importBtn?: HTMLButtonElement;
    private saveButton?: HTMLButtonElement;
    private unsubscribe: (() => void) | null = null;

    constructor(private readonly options: HeaderControlsOptions) {
        this.store = options.store;
        this.app = options.app;
        this.build(options.host);
        this.unsubscribe = this.store.subscribe(event => this.handleStoreEvent(event));
    }

    dispose() {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    setElementDefinitions(definitions: LayoutElementDefinition[]) {
        this.definitions = definitions;
        this.renderAddElementControl();
    }

    private build(host: HTMLElement) {
        host.empty();
        const header = host.createDiv({ cls: "sm-le-header" });
        createElementsHeading(header, 2, "Layout Editor");

        const controls = header.createDiv({ cls: "sm-le-controls" });

        const addGroup = createElementsField(controls, { label: "Element hinzufügen", layout: "stack" });
        addGroup.fieldEl.addClass("sm-le-control");
        addGroup.fieldEl.addClass("sm-le-control--stack");
        this.addElementHost = addGroup.controlEl;
        this.addElementHost.addClass("sm-le-add");
        this.renderAddElementControl();

        const libraryGroup = createElementsField(controls, { label: "Layout-Bibliothek", layout: "stack" });
        libraryGroup.fieldEl.addClass("sm-le-control");
        this.importBtn = createElementsButton(libraryGroup.controlEl, { label: "Gespeichertes Layout laden" });
        this.importBtn.onclick = () => this.promptImportSavedLayout();

        const sizeGroup = createElementsField(controls, { label: "Arbeitsfläche", layout: "inline" });
        sizeGroup.fieldEl.addClass("sm-le-control");
        const sizeWrapper = sizeGroup.controlEl;
        sizeWrapper.addClass("sm-le-size");
        this.widthInput = createElementsInput(sizeWrapper, {
            type: "number",
            min: 200,
            max: 2000,
            value: String(this.store.getState().canvasWidth),
        });
        ensureFieldLabelFor(sizeGroup, this.widthInput);
        this.widthInput.onchange = () => {
            const current = this.store.getState().canvasWidth;
            const next = clamp(parseInt(this.widthInput!.value, 10) || current, 200, 2000);
            this.store.setCanvasSize(next, this.store.getState().canvasHeight);
        };
        sizeWrapper.createSpan({ cls: "sm-elements-inline-text", text: "×" });
        this.heightInput = createElementsInput(sizeWrapper, {
            type: "number",
            min: 200,
            max: 2000,
            value: String(this.store.getState().canvasHeight),
        });
        this.heightInput.onchange = () => {
            const current = this.store.getState().canvasHeight;
            const next = clamp(parseInt(this.heightInput!.value, 10) || current, 200, 2000);
            this.store.setCanvasSize(this.store.getState().canvasWidth, next);
        };
        sizeWrapper.createSpan({ cls: "sm-elements-inline-text", text: "px" });

        this.statusEl = createElementsStatus(header, { text: "" });
        this.statusEl.addClass("sm-le-status");

        const exportWrap = host.createDiv({ cls: "sm-le-export" });
        exportWrap.createEl("h3", { text: "Layout-Daten" });
        const exportControls = exportWrap.createDiv({ cls: "sm-le-export__controls" });
        const copyBtn = createElementsButton(exportControls, { label: "JSON kopieren" });
        copyBtn.onclick = () => this.copyBlueprintToClipboard();
        this.saveButton = createElementsButton(exportControls, { label: "Layout speichern", variant: "primary" });
        this.saveButton.onclick = () => this.promptSaveLayout();
        this.exportEl = exportWrap.createEl("textarea", {
            cls: "sm-le-export__textarea",
            attr: { rows: "10", readonly: "readonly" },
        }) as HTMLTextAreaElement;
    }

    private handleStoreEvent(event: LayoutEditorStoreEvent) {
        if (event.type === "state") {
            this.updateFromState(event.state);
        } else if (event.type === "export") {
            if (this.exportEl) {
                this.exportEl.value = event.payload;
            }
        }
    }

    private updateFromState(state: ReturnType<LayoutEditorStore["getState"]>) {
        if (this.widthInput) this.widthInput.value = String(state.canvasWidth);
        if (this.heightInput) this.heightInput.value = String(state.canvasHeight);
        if (this.importBtn) {
            this.importBtn.toggleClass("is-loading", state.isImportingLayout);
            this.importBtn.disabled = state.isImportingLayout;
        }
        if (this.saveButton) {
            this.saveButton.toggleClass("is-loading", state.isSavingLayout);
            this.saveButton.disabled = state.isSavingLayout;
        }
        if (this.statusEl) {
            const count = state.elements.length;
            const parts = [`${count} Element${count === 1 ? "" : "e"}`];
            if (state.selectedElementId) {
                const selected = state.elements.find(el => el.id === state.selectedElementId);
                if (selected) {
                    const name = selected.label?.trim() || getElementTypeLabel(selected.type);
                    parts.push(`Ausgewählt: ${name}`);
                }
            }
            this.statusEl.setText(parts.join(" · "));
        }
    }

    private renderAddElementControl() {
        if (!this.addElementHost) return;
        const host = this.addElementHost;
        host.empty();
        const button = createElementsButton(host, { label: "+ Element", variant: "primary" });
        button.classList.add("sm-le-add__trigger");
        button.onclick = () => this.openElementPicker();
    }

    private openElementPicker() {
        if (!this.definitions.length) {
            new Notice("Keine Elementtypen registriert.");
            return;
        }
        const modal = new ElementPickerModal(this.app, {
            definitions: this.definitions,
            onPick: type => this.store.createElement(type),
        });
        modal.open();
    }

    private async promptImportSavedLayout() {
        if (this.store.getState().isImportingLayout) return;
        const picker = new LayoutPickerModal(this.app, {
            loadLayouts: () => listSavedLayouts(this.app),
            onPick: layoutId => {
                void this.importSavedLayout(layoutId);
            },
        });
        picker.open();
    }

    private async importSavedLayout(layoutId: string) {
        if (this.store.getState().isImportingLayout) return;
        this.store.setImportingLayout(true);
        try {
            const layout = await loadSavedLayout(this.app, layoutId);
            if (!layout) {
                new Notice("Layout konnte nicht geladen werden");
                return;
            }
            this.store.applySavedLayout(layout);
            new Notice(`Layout „${layout.name}” geladen`);
        } catch (error) {
            console.error("Failed to import saved layout", error);
            new Notice("Konnte Layout nicht laden");
        } finally {
            this.store.setImportingLayout(false);
        }
    }

    private promptSaveLayout() {
        if (this.store.getState().isSavingLayout) return;
        const modal = new NameInputModal(
            this.app,
            name => {
                void this.saveLayout(name);
            },
            {
                placeholder: "Layout-Namen eingeben",
                title: "Layout speichern",
                cta: "Speichern",
                initialValue: this.store.getState().lastSavedLayoutName,
            },
        );
        modal.open();
    }

    private async saveLayout(name: string) {
        const trimmed = name.trim();
        if (!trimmed) {
            new Notice("Bitte gib einen Namen für das Layout an");
            return;
        }
        if (this.store.getState().isSavingLayout) return;
        this.store.setSavingLayout(true);
        try {
            const state = this.store.getState();
            const reuseId = state.lastSavedLayoutName === trimmed ? state.lastSavedLayoutId ?? undefined : undefined;
            const saved = await saveLayoutToLibrary(this.app, {
                name: trimmed,
                id: reuseId,
                canvasWidth: state.canvasWidth,
                canvasHeight: state.canvasHeight,
                elements: state.elements.map(cloneLayoutElement),
            });
            this.store.updateSavedLayoutMetadata(saved);
            new Notice(`Layout „${saved.name}” gespeichert`);
        } catch (error) {
            console.error("Failed to save layout", error);
            const message = error instanceof Error && error.message ? error.message : "Konnte Layout nicht speichern";
            new Notice(message);
        } finally {
            this.store.setSavingLayout(false);
        }
    }

    private async copyBlueprintToClipboard() {
        if (!this.exportEl || !this.exportEl.value) return;
        try {
            const clip = navigator.clipboard;
            if (!clip || typeof clip.writeText !== "function") {
                throw new Error("Clipboard API nicht verfügbar");
            }
            await clip.writeText(this.exportEl.value);
            new Notice("Layout kopiert");
        } catch (error) {
            console.error("Clipboard write failed", error);
            new Notice("Konnte nicht in die Zwischenablage kopieren");
        }
    }
}
