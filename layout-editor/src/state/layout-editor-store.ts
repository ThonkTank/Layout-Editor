// src/state/layout-editor-store.ts
import {
    MIN_ELEMENT_SIZE,
    getElementDefinition,
    isContainerType,
    isVerticalContainer,
} from "../definitions";
import { LayoutHistory } from "../history";
import { LayoutTree } from "../model/layout-tree";
import { collectDescendantIds } from "../utils/tree-helpers";
import { LayoutBlueprint, LayoutEditorSnapshot, LayoutElement, LayoutElementType, SavedLayout } from "../types";
import { cloneLayoutElement } from "../utils";

export interface LayoutEditorState {
    readonly canvasWidth: number;
    readonly canvasHeight: number;
    readonly elements: LayoutElement[];
    readonly selectedElementId: string | null;
    readonly draggedElementId: string | null;
    readonly isSavingLayout: boolean;
    readonly isImportingLayout: boolean;
    readonly lastSavedLayoutId: string | null;
    readonly lastSavedLayoutName: string;
    readonly lastSavedLayoutCreatedAt: string | null;
    readonly lastSavedLayoutUpdatedAt: string | null;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}

export type LayoutEditorStoreEvent =
    | { type: "state"; state: LayoutEditorState }
    | { type: "export"; payload: string };

export interface CreateElementOptions {
    parentId?: string | null;
}

interface ApplyLayoutOptions {
    silent?: boolean;
}

export class LayoutEditorStore {
    private readonly listeners = new Set<(event: LayoutEditorStoreEvent) => void>();
    private readonly tree = new LayoutTree();
    private exportPayload = "";
    private exportDirty = true;
    private state: LayoutEditorState = {
        canvasWidth: 800,
        canvasHeight: 600,
        elements: [],
        selectedElementId: null,
        draggedElementId: null,
        isSavingLayout: false,
        isImportingLayout: false,
        lastSavedLayoutId: null,
        lastSavedLayoutName: "",
        lastSavedLayoutCreatedAt: null,
        lastSavedLayoutUpdatedAt: null,
        canUndo: false,
        canRedo: false,
    };
    private readonly history: LayoutHistory;

    constructor() {
        this.history = new LayoutHistory(
            () => this.captureSnapshot(),
            snapshot => this.restoreSnapshot(snapshot),
        );
        this.history.reset(this.captureSnapshot());
        this.exportDirty = true;
    }

    subscribe(listener: (event: LayoutEditorStoreEvent) => void) {
        this.listeners.add(listener);
        listener({ type: "state", state: this.state });
        listener({ type: "export", payload: this.ensureExportPayload() });
        return () => {
            this.listeners.delete(listener);
        };
    }

    getState(): LayoutEditorState {
        return this.state;
    }

    selectElement(id: string | null) {
        if (this.state.selectedElementId === id) return;
        this.patchState({ selectedElementId: id });
    }

    setCanvasSize(width: number, height: number) {
        const nextWidth = clamp(width, 200, 2000);
        const nextHeight = clamp(height, 200, 2000);
        if (nextWidth === this.state.canvasWidth && nextHeight === this.state.canvasHeight) {
            return;
        }
        this.state.canvasWidth = nextWidth;
        this.state.canvasHeight = nextHeight;
        this.clampElementsToCanvas();
        this.emitState();
        this.commitHistory();
    }

    createElement(type: LayoutElementType, options?: CreateElementOptions) {
        const def = getElementDefinition(type);
        const width = def ? def.width : Math.min(240, Math.max(160, Math.round(this.state.canvasWidth * 0.25)));
        const height = def ? def.height : Math.min(160, Math.max(120, Math.round(this.state.canvasHeight * 0.25)));
        const element: LayoutElement = {
            id: generateElementId(),
            type,
            x: Math.max(0, Math.round((this.state.canvasWidth - width) / 2)),
            y: Math.max(0, Math.round((this.state.canvasHeight - height) / 2)),
            width,
            height,
            label: def?.defaultLabel ?? type,
            description: def?.defaultDescription,
            placeholder: def?.defaultPlaceholder,
            defaultValue: def?.defaultValue,
            options: def?.options ? [...def.options] : undefined,
            attributes: [],
        };

        if (def?.defaultLayout) {
            element.layout = { ...def.defaultLayout };
        }

        const requestedParentId = options?.parentId ?? null;
        const parentContainer = this.resolveParentContainer(requestedParentId);
        if (parentContainer) {
            element.parentId = parentContainer.id;
            const padding = parentContainer.layout?.padding ?? 0;
            element.x = parentContainer.x + padding;
            element.y = parentContainer.y + padding;
            element.width = Math.min(parentContainer.width - padding * 2, element.width);
            element.height = Math.min(parentContainer.height - padding * 2, element.height);
        }

        this.tree.insert(element, { parentId: parentContainer?.id ?? null });
        this.patchState({ selectedElementId: element.id });

        if (parentContainer) {
            this.applyContainerLayout(parentContainer.id);
        } else {
            this.emitState();
        }

        this.commitHistory();
    }

    deleteElement(id: string) {
        const element = this.tree.getElement(id);
        if (!element) return;
        const parentId = element.parentId ?? null;
        this.tree.remove(id);
        const nextSelected = this.state.selectedElementId === id ? null : this.state.selectedElementId;
        this.patchState({ selectedElementId: nextSelected });
        if (parentId) {
            this.applyContainerLayout(parentId);
        } else {
            this.emitState();
        }
        this.commitHistory();
    }

    assignElementToContainer(elementId: string, containerId: string | null) {
        const element = this.tree.getElement(elementId);
        if (!element) return;
        const currentParentId = element.parentId ?? null;
        let nextParentId: string | null = null;

        if (containerId) {
            const candidate = this.tree.getElement(containerId);
            if (candidate && isContainerType(candidate.type) && candidate.id !== element.id) {
                const descendants = collectDescendantIds(this.tree, element.id);
                if (!descendants.has(candidate.id)) {
                    nextParentId = candidate.id;
                }
            }
        }

        if (containerId && !nextParentId) return;

        const changed = this.tree.setParent(element.id, nextParentId);
        if (!changed) {
            this.emitState();
            return;
        }

        if (currentParentId && currentParentId !== nextParentId) {
            this.applyContainerLayout(currentParentId, { silent: true });
        }

        if (nextParentId) {
            this.applyContainerLayout(nextParentId);
        } else {
            this.emitState();
        }

        this.commitHistory();
    }

    moveChildInContainer(containerId: string, childId: string, offset: number) {
        const moved = this.tree.moveChild(containerId, childId, offset);
        if (!moved) return;
        this.applyContainerLayout(containerId);
        this.commitHistory();
    }

    setDraggedElement(id: string | null) {
        if (this.state.draggedElementId === id) return;
        this.patchState({ draggedElementId: id });
    }

    ensureContainerDefaults(elementId: string) {
        const element = this.tree.getElement(elementId);
        if (!element || !isContainerType(element.type)) return;
        let changed = false;
        if (!element.layout) {
            const def = getElementDefinition(element.type);
            if (def?.defaultLayout) {
                element.layout = { ...def.defaultLayout };
            } else {
                element.layout = { gap: 16, padding: 16, align: "stretch" };
            }
            changed = true;
        }
        if (changed) {
            this.emitState({ skipExport: true });
        }
    }

    applyContainerLayout(elementId: string, options?: ApplyLayoutOptions) {
        const element = this.tree.getElement(elementId);
        if (!element || !isContainerType(element.type) || !element.layout) return;
        const padding = element.layout.padding;
        const gap = element.layout.gap;
        const align = element.layout.align;
        const children = this.tree.getChildElements(element.id);
        if (!children.length) {
            if (!options?.silent) {
                this.emitState();
            }
            return;
        }

        const innerWidth = Math.max(MIN_ELEMENT_SIZE, element.width - padding * 2);
        const innerHeight = Math.max(MIN_ELEMENT_SIZE, element.height - padding * 2);
        const gapCount = Math.max(0, children.length - 1);

        if (isVerticalContainer(element.type)) {
            const availableHeight = innerHeight - gap * gapCount;
            const slotHeight = Math.max(MIN_ELEMENT_SIZE, Math.floor(availableHeight / children.length));
            let y = element.y + padding;
            for (const child of children) {
                child.parentId = element.id;
                child.height = slotHeight;
                child.y = y;
                let width = innerWidth;
                if (align === "stretch") {
                    child.x = element.x + padding;
                } else {
                    width = Math.min(child.width, innerWidth);
                    if (align === "center") {
                        child.x = element.x + padding + Math.round((innerWidth - width) / 2);
                    } else if (align === "end") {
                        child.x = element.x + padding + (innerWidth - width);
                    } else {
                        child.x = element.x + padding;
                    }
                }
                child.width = width;
                y += slotHeight + gap;
            }
        } else {
            const availableWidth = innerWidth - gap * gapCount;
            const slotWidth = Math.max(MIN_ELEMENT_SIZE, Math.floor(availableWidth / children.length));
            let x = element.x + padding;
            for (const child of children) {
                child.parentId = element.id;
                child.width = slotWidth;
                child.x = x;
                let height = innerHeight;
                if (align === "stretch") {
                    child.y = element.y + padding;
                } else {
                    height = Math.min(child.height, innerHeight);
                    if (align === "center") {
                        child.y = element.y + padding + Math.round((innerHeight - height) / 2);
                    } else if (align === "end") {
                        child.y = element.y + padding + (innerHeight - height);
                    } else {
                        child.y = element.y + padding;
                    }
                }
                child.height = height;
                x += slotWidth + gap;
            }
        }

        if (!options?.silent) {
            this.emitState();
        }
    }

    updateElementFrame(elementId: string, frame: Partial<Pick<LayoutElement, "x" | "y" | "width" | "height">>) {
        const element = this.tree.getElement(elementId);
        if (!element) return;
        let changed = false;
        if (typeof frame.x === "number" && frame.x !== element.x) {
            element.x = frame.x;
            changed = true;
        }
        if (typeof frame.y === "number" && frame.y !== element.y) {
            element.y = frame.y;
            changed = true;
        }
        if (typeof frame.width === "number" && frame.width !== element.width) {
            element.width = frame.width;
            changed = true;
        }
        if (typeof frame.height === "number" && frame.height !== element.height) {
            element.height = frame.height;
            changed = true;
        }
        if (changed) {
            this.emitState({ skipExport: true });
        }
    }

    undo() {
        this.history.undo();
        this.emitState();
    }

    redo() {
        this.history.redo();
        this.emitState();
    }

    pushHistorySnapshot() {
        this.commitHistory();
    }

    applySavedLayout(layout: SavedLayout) {
        this.tree.load(layout.elements);
        this.patchState({
            canvasWidth: layout.canvasWidth,
            canvasHeight: layout.canvasHeight,
            selectedElementId: null,
            lastSavedLayoutId: layout.id,
            lastSavedLayoutName: layout.name,
            lastSavedLayoutCreatedAt: layout.createdAt,
            lastSavedLayoutUpdatedAt: layout.updatedAt,
        });
        this.history.reset(this.captureSnapshot());
        this.emitState();
    }

    serializeState(): string {
        const payload: LayoutBlueprint & {
            id: string | null;
            name: string | null;
            createdAt: string | null;
            updatedAt: string | null;
        } = {
            canvasWidth: Math.round(this.state.canvasWidth),
            canvasHeight: Math.round(this.state.canvasHeight),
            elements: this.state.elements.map(element => {
                const clone = cloneLayoutElement(element);
                return {
                    ...clone,
                    x: Math.round(clone.x),
                    y: Math.round(clone.y),
                    width: Math.round(clone.width),
                    height: Math.round(clone.height),
                };
            }),
            id: this.state.lastSavedLayoutId,
            name: this.state.lastSavedLayoutName.trim() ? this.state.lastSavedLayoutName : null,
            createdAt: this.state.lastSavedLayoutCreatedAt,
            updatedAt: this.state.lastSavedLayoutUpdatedAt ?? this.state.lastSavedLayoutCreatedAt,
        };
        return JSON.stringify(payload, null, 2);
    }

    private ensureExportPayload(): string {
        if (this.exportDirty) {
            this.exportPayload = this.serializeState();
            this.exportDirty = false;
        }
        return this.exportPayload;
    }

    updateSavedLayoutMetadata(layout: SavedLayout) {
        this.patchState({
            lastSavedLayoutId: layout.id,
            lastSavedLayoutName: layout.name,
            lastSavedLayoutCreatedAt: layout.createdAt,
            lastSavedLayoutUpdatedAt: layout.updatedAt,
        });
    }

    setSavingLayout(isSaving: boolean) {
        if (this.state.isSavingLayout === isSaving) return;
        this.patchState({ isSavingLayout: isSaving });
    }

    setImportingLayout(isImporting: boolean) {
        if (this.state.isImportingLayout === isImporting) return;
        this.patchState({ isImportingLayout: isImporting });
    }

    private captureSnapshot(): LayoutEditorSnapshot {
        return {
            canvasWidth: this.state.canvasWidth,
            canvasHeight: this.state.canvasHeight,
            selectedElementId: this.state.selectedElementId,
            elements: this.tree.getElementsSnapshot().map(cloneLayoutElement),
        };
    }

    private restoreSnapshot(snapshot: LayoutEditorSnapshot) {
        this.tree.load(snapshot.elements);
        this.patchState({
            canvasWidth: snapshot.canvasWidth,
            canvasHeight: snapshot.canvasHeight,
            selectedElementId: snapshot.selectedElementId,
        });
    }

    private resolveParentContainer(requestedParentId: string | null): LayoutElement | null {
        if (requestedParentId) {
            const candidate = this.tree.getElement(requestedParentId);
            if (candidate && isContainerType(candidate.type)) {
                return candidate;
            }
        }
        if (this.state.selectedElementId) {
            const selected = this.tree.getElement(this.state.selectedElementId);
            if (selected && isContainerType(selected.type)) {
                return selected;
            }
        }
        return null;
    }

    flushExport() {
        if (!this.exportDirty) return;
        const payload = this.ensureExportPayload();
        for (const listener of this.listeners) {
            listener({ type: "export", payload });
        }
    }

    private emitState(options?: { skipExport?: boolean }) {
        this.patchState({}, options);
    }

    private patchState(patch: Partial<LayoutEditorState>, options?: { skipExport?: boolean }) {
        const elements = this.tree.getElementsSnapshot();
        this.state = {
            ...this.state,
            ...patch,
            elements,
            canUndo: this.history.canUndo,
            canRedo: this.history.canRedo,
        };
        this.exportDirty = true;
        const listeners = Array.from(this.listeners);
        for (const listener of listeners) {
            listener({ type: "state", state: this.state });
        }
        if (!options?.skipExport) {
            const payload = this.ensureExportPayload();
            for (const listener of listeners) {
                listener({ type: "export", payload });
            }
        }
    }

    private commitHistory() {
        if (this.history.isRestoring) return;
        this.history.push(this.captureSnapshot());
        this.emitState();
    }

    private clampElementsToCanvas() {
        const elements = this.tree.getElementsSnapshot();
        for (const element of elements) {
            const maxX = Math.max(0, this.state.canvasWidth - element.width);
            const maxY = Math.max(0, this.state.canvasHeight - element.height);
            element.x = clamp(element.x, 0, maxX);
            element.y = clamp(element.y, 0, maxY);
            const maxWidth = Math.max(MIN_ELEMENT_SIZE, this.state.canvasWidth - element.x);
            const maxHeight = Math.max(MIN_ELEMENT_SIZE, this.state.canvasHeight - element.y);
            element.width = clamp(element.width, MIN_ELEMENT_SIZE, maxWidth);
            element.height = clamp(element.height, MIN_ELEMENT_SIZE, maxHeight);
        }
        for (const element of elements) {
            if (isContainerType(element.type)) {
                this.applyContainerLayout(element.id, { silent: true });
            }
        }
    }
}

function generateElementId() {
    return `element-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
