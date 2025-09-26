// src/state/layout-editor-store.ts
import {
    MIN_ELEMENT_SIZE,
    getElementDefinition,
    isContainerType,
    isVerticalContainer,
} from "../definitions";
import { LayoutHistory } from "../history";
import { LayoutBlueprint, LayoutEditorSnapshot, LayoutElement, LayoutElementType, SavedLayout } from "../types";
import { cloneLayoutElement, collectDescendantIds, isContainerElement } from "../utils";

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
    }

    subscribe(listener: (event: LayoutEditorStoreEvent) => void) {
        this.listeners.add(listener);
        listener({ type: "state", state: this.state });
        listener({ type: "export", payload: this.serializeState() });
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
            element.children = [];
        }

        const requestedParentId = options?.parentId ?? null;
        const parentContainer = this.resolveParentContainer(requestedParentId);
        if (parentContainer) {
            element.parentId = parentContainer.id;
            const padding = parentContainer.layout!.padding;
            element.x = parentContainer.x + padding;
            element.y = parentContainer.y + padding;
            element.width = Math.min(parentContainer.width - padding * 2, element.width);
            element.height = Math.min(parentContainer.height - padding * 2, element.height);
        }

        const nextElements = [...this.state.elements, element];
        this.patchState({ elements: nextElements, selectedElementId: element.id });

        if (parentContainer) {
            this.addChildToContainer(parentContainer.id, element.id);
            this.applyContainerLayout(parentContainer.id);
        }

        this.commitHistory();
    }

    deleteElement(id: string) {
        const elements = this.state.elements;
        const index = elements.findIndex(el => el.id === id);
        if (index === -1) return;
        const element = elements[index];
        const next = elements.filter(el => el.id !== id);

        if (isContainerType(element.type) && Array.isArray(element.children)) {
            for (const childId of element.children) {
                const child = next.find(el => el.id === childId);
                if (child) {
                    child.parentId = undefined;
                }
            }
        }

        if (element.parentId) {
            const parent = next.find(el => el.id === element.parentId);
            if (parent && isContainerElement(parent)) {
                parent.children = (parent.children ?? []).filter(childId => childId !== element.id);
            }
        }

        const nextSelected = this.state.selectedElementId === id ? null : this.state.selectedElementId;
        this.patchState({ elements: next, selectedElementId: nextSelected });
        this.commitHistory();
    }

    assignElementToContainer(elementId: string, containerId: string | null) {
        const element = this.state.elements.find(el => el.id === elementId);
        if (!element) return;
        const currentParent = element.parentId ? this.state.elements.find(el => el.id === element.parentId) : null;
        let nextParent: LayoutElement | null = null;
        if (containerId) {
            const candidate = this.state.elements.find(el => el.id === containerId);
            if (candidate && isContainerElement(candidate)) {
                if (candidate.id !== element.id && !this.wouldCreateCycle(element, candidate)) {
                    nextParent = candidate;
                }
            }
        }
        if (containerId && !nextParent) return;

        if (currentParent && isContainerElement(currentParent)) {
            currentParent.children = (currentParent.children ?? []).filter(id => id !== element.id);
            if (currentParent.id === nextParent?.id) {
                this.emitState();
                return;
            }
            if (currentParent.layout) {
                this.applyContainerLayout(currentParent.id, { silent: true });
            }
        }

        if (nextParent) {
            element.parentId = nextParent.id;
            nextParent.children = [...(nextParent.children ?? []), element.id];
            this.applyContainerLayout(nextParent.id);
        } else {
            element.parentId = undefined;
        }

        this.emitState();
        this.commitHistory();
    }

    moveChildInContainer(containerId: string, childId: string, offset: number) {
        const container = this.state.elements.find(el => el.id === containerId);
        if (!container || !isContainerElement(container) || !container.children) return;
        const index = container.children.indexOf(childId);
        if (index === -1) return;
        const nextIndex = clamp(index + offset, 0, container.children.length - 1);
        if (index === nextIndex) return;
        const nextChildren = [...container.children];
        const [removed] = nextChildren.splice(index, 1);
        nextChildren.splice(nextIndex, 0, removed);
        container.children = nextChildren;
        this.applyContainerLayout(containerId);
        this.commitHistory();
    }

    setDraggedElement(id: string | null) {
        if (this.state.draggedElementId === id) return;
        this.patchState({ draggedElementId: id });
    }

    ensureContainerDefaults(elementId: string) {
        const element = this.state.elements.find(el => el.id === elementId);
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
        if (!Array.isArray(element.children)) {
            element.children = [];
            changed = true;
        }
        if (changed) {
            this.emitState();
        }
    }

    applyContainerLayout(elementId: string, options?: ApplyLayoutOptions) {
        const element = this.state.elements.find(el => el.id === elementId);
        if (!element || !isContainerElement(element) || !element.layout) return;
        const padding = element.layout.padding;
        const gap = element.layout.gap;
        const align = element.layout.align;
        const children: LayoutElement[] = [];
        const validIds: string[] = [];
        for (const id of element.children ?? []) {
            if (id === element.id) continue;
            const child = this.state.elements.find(el => el.id === id);
            if (child) {
                children.push(child);
                validIds.push(id);
            }
        }
        element.children = validIds;
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
        const element = this.state.elements.find(el => el.id === elementId);
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
            this.emitState();
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
        this.patchState({
            canvasWidth: layout.canvasWidth,
            canvasHeight: layout.canvasHeight,
            elements: layout.elements.map(cloneLayoutElement),
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
            elements: this.state.elements.map(cloneLayoutElement),
        };
    }

    private restoreSnapshot(snapshot: LayoutEditorSnapshot) {
        this.state = {
            ...this.state,
            canvasWidth: snapshot.canvasWidth,
            canvasHeight: snapshot.canvasHeight,
            selectedElementId: snapshot.selectedElementId,
            elements: snapshot.elements.map(cloneLayoutElement),
        };
        this.emitState();
    }

    private resolveParentContainer(requestedParentId: string | null): LayoutElement | null {
        let parentContainer: LayoutElement | null = null;
        if (requestedParentId) {
            const candidate = this.state.elements.find(el => el.id === requestedParentId);
            if (candidate && isContainerElement(candidate)) {
                parentContainer = candidate;
            }
        }
        if (!parentContainer && this.state.selectedElementId) {
            const selected = this.state.elements.find(el => el.id === this.state.selectedElementId);
            if (selected && isContainerElement(selected)) {
                parentContainer = selected;
            }
        }
        return parentContainer;
    }

    private addChildToContainer(containerId: string, childId: string) {
        const container = this.state.elements.find(el => el.id === containerId);
        if (!container || !isContainerElement(container)) return;
        if (!Array.isArray(container.children)) {
            container.children = [];
        }
        if (!container.children.includes(childId)) {
            container.children.push(childId);
        }
    }

    private wouldCreateCycle(source: LayoutElement, target: LayoutElement): boolean {
        if (!isContainerElement(source)) return false;
        const descendants = collectDescendantIds(source, this.state.elements);
        if (descendants.has(target.id)) return true;
        let cursor = target.parentId ? this.state.elements.find(el => el.id === target.parentId) : null;
        while (cursor) {
            if (cursor.id === source.id) return true;
            cursor = cursor.parentId ? this.state.elements.find(el => el.id === cursor.parentId) : null;
        }
        return false;
    }

    private emitState() {
        this.patchState({});
    }

    private patchState(patch: Partial<LayoutEditorState>) {
        this.state = {
            ...this.state,
            ...patch,
            canUndo: this.history.canUndo,
            canRedo: this.history.canRedo,
        };
        const serialized = this.serializeState();
        for (const listener of this.listeners) {
            listener({ type: "state", state: this.state });
            listener({ type: "export", payload: serialized });
        }
    }

    private commitHistory() {
        if (this.history.isRestoring) return;
        this.history.push(this.captureSnapshot());
        this.emitState();
    }

    private clampElementsToCanvas() {
        for (const element of this.state.elements) {
            const maxX = Math.max(0, this.state.canvasWidth - element.width);
            const maxY = Math.max(0, this.state.canvasHeight - element.height);
            element.x = clamp(element.x, 0, maxX);
            element.y = clamp(element.y, 0, maxY);
            const maxWidth = Math.max(MIN_ELEMENT_SIZE, this.state.canvasWidth - element.x);
            const maxHeight = Math.max(MIN_ELEMENT_SIZE, this.state.canvasHeight - element.y);
            element.width = clamp(element.width, MIN_ELEMENT_SIZE, maxWidth);
            element.height = clamp(element.height, MIN_ELEMENT_SIZE, maxHeight);
        }
        for (const element of this.state.elements) {
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
