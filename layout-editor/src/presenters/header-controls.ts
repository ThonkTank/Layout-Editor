// src/presenters/header-controls.ts
import type { App, Notice as ObsidianNotice } from "obsidian";
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
import { renderComponent } from "../ui/components/component";
import { StatusBannerComponent, type StatusBannerState } from "../ui/components/status-banner";

export interface LayoutPersistenceErrorViewModel extends StatusBannerState {
    code: string;
    noticeMessage: string;
}

const PERSISTENCE_CODE_MAP: Record<string, { title: string; description: string; help?: string; notice?: string }> = {
    "layout/id-invalid": {
        title: "Ungültige Layout-ID",
        description: "Der gespeicherte Name kann nicht verwendet werden. Wähle einen anderen Namen ohne Sonderpfade.",
        help: "Vermeide reservierte Namen wie '.' oder '..'.",
    },
    "layout/id-invalid-characters": {
        title: "Layout-ID enthält unerlaubte Zeichen",
        description: "Die Layout-ID darf keine Schrägstriche enthalten. Bitte entferne '/' oder '\\' aus dem Namen.",
    },
    "layout/canvas-width-invalid": {
        title: "Breite der Arbeitsfläche ist ungültig",
        description: "Die gespeicherte Breite muss eine positive Zahl sein.",
        help: "Passe die Breite im Eingabefeld an (200–2000 px).",
    },
    "layout/canvas-height-invalid": {
        title: "Höhe der Arbeitsfläche ist ungültig",
        description: "Die gespeicherte Höhe muss eine positive Zahl sein.",
        help: "Passe die Höhe im Eingabefeld an (200–2000 px).",
    },
    "layout/elements-empty": {
        title: "Keine Layout-Elemente",
        description: "Das Layout enthält keine gültigen Elemente und kann daher nicht gespeichert werden.",
        help: "Füge mindestens ein Element hinzu oder lade ein gespeichertes Layout.",
    },
    "layout/elements-invalid": {
        title: "Elemente enthalten ungültige Werte",
        description: "Mindestens ein Element besitzt ungültige Eigenschaften und wurde vom Speichern ausgeschlossen.",
        help: "Prüfe neu hinzugefügte Elemente oder importierte Daten auf vollständige Angaben.",
    },
    "layout/unknown": {
        title: "Speichern fehlgeschlagen",
        description: "Das Layout konnte nicht gespeichert werden. Details findest du unten.",
        notice: "Layout konnte nicht gespeichert werden",
    },
};

const PERSISTENCE_MESSAGE_CODES: Array<{ match: RegExp; code: keyof typeof PERSISTENCE_CODE_MAP }> = [
    { match: /Layout-ID darf keine Pfadtrenner enthalten\.?$/i, code: "layout/id-invalid-characters" },
    { match: /Layout-ID ist ungültig\.?$/i, code: "layout/id-invalid" },
    { match: /Ungültige Breite für das Layout\.?$/i, code: "layout/canvas-width-invalid" },
    { match: /Ungültige Höhe für das Layout\.?$/i, code: "layout/canvas-height-invalid" },
    { match: /Layout enthält keine gültigen Elemente\.?$/i, code: "layout/elements-empty" },
    {
        match: /Mindestens ein Layout-Element enthält ungültige Werte und konnte nicht gespeichert werden\.?$/i,
        code: "layout/elements-invalid",
    },
];

export function describeLayoutPersistenceError(error: unknown): LayoutPersistenceErrorViewModel {
    const normalized = normalizePersistenceError(error);
    const code = resolvePersistenceErrorCode(normalized);
    const mapping = PERSISTENCE_CODE_MAP[code] ?? PERSISTENCE_CODE_MAP["layout/unknown"];
    const noticeMessage = mapping.notice ?? mapping.title;
    const details = createPersistenceDetails(code, normalized.message, mapping.help);
    return {
        tone: "danger",
        title: mapping.title,
        description: mapping.description,
        details,
        code,
        noticeMessage,
    };
}

interface NormalizedPersistenceError {
    code?: string;
    message?: string;
}

function normalizePersistenceError(error: unknown): NormalizedPersistenceError {
    if (!error) {
        return {};
    }
    if (typeof error === "string") {
        return { message: error };
    }
    if (error instanceof Error) {
        const code = typeof (error as any).code === "string" ? (error as any).code : undefined;
        return { code, message: error.message };
    }
    if (typeof error === "object") {
        const code = typeof (error as { code?: string }).code === "string" ? (error as { code?: string }).code : undefined;
        const message = typeof (error as { message?: unknown }).message === "string" ? (error as { message?: unknown }).message : undefined;
        return { code, message };
    }
    return { message: String(error) };
}

function resolvePersistenceErrorCode(error: NormalizedPersistenceError): keyof typeof PERSISTENCE_CODE_MAP {
    if (error.code && error.code in PERSISTENCE_CODE_MAP) {
        return error.code as keyof typeof PERSISTENCE_CODE_MAP;
    }
    const message = error.message?.trim();
    if (message) {
        for (const candidate of PERSISTENCE_MESSAGE_CODES) {
            if (candidate.match.test(message)) {
                return candidate.code;
            }
        }
    }
    return "layout/unknown";
}

function createPersistenceDetails(
    code: keyof typeof PERSISTENCE_CODE_MAP,
    rawMessage: string | undefined,
    help: string | undefined,
): StatusBannerState["details"] {
    const details = [] as NonNullable<StatusBannerState["details"]>;
    details.push({ label: "Fehlercode", text: code });
    if (help) {
        details.push({ label: "Empfehlung", text: help });
    }
    if (rawMessage && !PERSISTENCE_MESSAGE_CODES.some(entry => entry.code === code && entry.match.test(rawMessage))) {
        details.push({ label: "Rohmeldung", text: rawMessage });
    }
    return details;
}

type NoticeConstructor = new (message: string, timeout?: number) => ObsidianNotice;

let cachedNoticeCtor: NoticeConstructor | null = null;

function resolveNoticeConstructor(): NoticeConstructor | null {
    if (cachedNoticeCtor) {
        return cachedNoticeCtor;
    }
    const requireFn = (globalThis as { require?: (id: string) => unknown }).require;
    if (typeof requireFn === "function") {
        try {
            const mod = requireFn("obsidian") as { Notice?: NoticeConstructor };
            if (mod && typeof mod.Notice === "function") {
                cachedNoticeCtor = mod.Notice;
                return cachedNoticeCtor;
            }
        } catch (error) {
            console.warn("Could not load Obsidian Notice constructor", error);
        }
    }
    return null;
}

function showNotice(message: string) {
    const ctor = resolveNoticeConstructor();
    if (ctor) {
        new ctor(message);
    } else {
        console.warn("Notice:", message);
    }
}

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
    private persistenceBannerHost?: HTMLElement;
    private persistenceBanner?: StatusBannerComponent;
    private exportEl?: HTMLTextAreaElement;
    private importBtn?: HTMLButtonElement;
    private saveButton?: HTMLButtonElement;
    private unsubscribe: (() => void) | null = null;
    private lastPersistenceError: LayoutPersistenceErrorViewModel | null = null;

    constructor(private readonly options: HeaderControlsOptions) {
        this.store = options.store;
        this.app = options.app;
        this.build(options.host);
        this.unsubscribe = this.store.subscribe(event => this.handleStoreEvent(event));
    }

    dispose() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.persistenceBanner?.destroy();
        this.persistenceBanner = undefined;
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

        this.persistenceBannerHost = header.createDiv({ cls: "sm-le-header__banner" });
        this.persistenceBanner = renderComponent(
            this.persistenceBannerHost,
            new StatusBannerComponent(this.lastPersistenceError),
        );

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
        if (this.lastPersistenceError && state.isSavingLayout) {
            // keep banner visible while saving to avoid flicker
        } else if (this.lastPersistenceError && !state.isSavingLayout) {
            // clear banner once saving has completed after an error was resolved externally
            this.clearPersistenceError();
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
            showNotice("Keine Elementtypen registriert.");
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
                showNotice("Layout konnte nicht geladen werden");
                return;
            }
            this.store.applySavedLayout(layout);
            showNotice(`Layout „${layout.name}” geladen`);
        } catch (error) {
            console.error("Failed to import saved layout", error);
            showNotice("Konnte Layout nicht laden");
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
            showNotice("Bitte gib einen Namen für das Layout an");
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
            this.clearPersistenceError();
            showNotice(`Layout „${saved.name}” gespeichert`);
        } catch (error) {
            console.error("Failed to save layout", error);
            const persistenceError = describeLayoutPersistenceError(error);
            this.showPersistenceError(persistenceError);
            showNotice(persistenceError.noticeMessage);
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
            showNotice("Layout kopiert");
        } catch (error) {
            console.error("Clipboard write failed", error);
            showNotice("Konnte nicht in die Zwischenablage kopieren");
        }
    }

    private showPersistenceError(error: LayoutPersistenceErrorViewModel) {
        this.lastPersistenceError = error;
        if (!this.persistenceBanner && this.persistenceBannerHost) {
            this.persistenceBanner = renderComponent(
                this.persistenceBannerHost,
                new StatusBannerComponent(error),
            );
            return;
        }
        this.persistenceBanner?.setState(error);
    }

    private clearPersistenceError() {
        this.lastPersistenceError = null;
        this.persistenceBanner?.setState(null);
    }
}
