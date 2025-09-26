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

type MutableLayoutEditorState = {
    canvasWidth: number;
    canvasHeight: number;
    selectedElementId: string | null;
    draggedElementId: string | null;
    isSavingLayout: boolean;
    isImportingLayout: boolean;
    lastSavedLayoutId: string | null;
    lastSavedLayoutName: string;
    lastSavedLayoutCreatedAt: string | null;
    lastSavedLayoutUpdatedAt: string | null;
    canUndo: boolean;
    canRedo: boolean;
};

interface MutationOptions {
    skipExport?: boolean;
}

interface StatePatchOptions extends MutationOptions {
    skipEmit?: boolean;
}

interface MoveElementOptions extends MutationOptions {
    cascadeChildren?: boolean;
}

interface ElementSnapshotPatch {
    label?: string;
    description?: string | undefined;
    placeholder?: string | undefined;
    defaultValue?: string | undefined;
    options?: string[] | undefined;
    attributes?: string[];
    layout?: LayoutElement["layout"];
    viewBindingId?: string | undefined;
    viewState?: Record<string, unknown> | undefined;
}

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
    private interactionDepth = 0;
    private pendingStateEmit = false;
    private pendingSkipExport = true;
    private readonly stateRef: MutableLayoutEditorState = {
        canvasWidth: 800,
        canvasHeight: 600,
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
        listener({ type: "state", state: this.createSnapshot() });
        listener({ type: "export", payload: this.ensureExportPayload() });
        return () => {
            this.listeners.delete(listener);
        };
    }

    getState(): LayoutEditorState {
        return this.createSnapshot();
    }

    runInteraction<T>(operation: () => T): T {
        this.interactionDepth++;
        try {
            return operation();
        } finally {
            this.interactionDepth--;
            if (this.interactionDepth === 0 && this.pendingStateEmit) {
                const skipExport = this.pendingSkipExport;
                this.pendingStateEmit = false;
                this.pendingSkipExport = true;
                this.dispatchState(skipExport ? { skipExport: true } : undefined);
            }
        }
    }

    selectElement(id: string | null) {
        if (this.stateRef.selectedElementId === id) return;
        this.patchState({ selectedElementId: id });
    }

    setCanvasSize(width: number, height: number) {
        const nextWidth = clamp(width, 200, 2000);
        const nextHeight = clamp(height, 200, 2000);
        if (nextWidth === this.stateRef.canvasWidth && nextHeight === this.stateRef.canvasHeight) {
            return;
        }
        this.stateRef.canvasWidth = nextWidth;
        this.stateRef.canvasHeight = nextHeight;
        this.markStateMutated();
        this.clampElementsToCanvas();
        this.emitState();
        this.commitHistory();
    }

    createElement(type: LayoutElementType, options?: CreateElementOptions) {
        const def = getElementDefinition(type);
        const width = def ? def.width : Math.min(240, Math.max(160, Math.round(this.stateRef.canvasWidth * 0.25)));
        const height = def ? def.height : Math.min(160, Math.max(120, Math.round(this.stateRef.canvasHeight * 0.25)));
        const element: LayoutElement = {
            id: generateElementId(),
            type,
            x: Math.max(0, Math.round((this.stateRef.canvasWidth - width) / 2)),
            y: Math.max(0, Math.round((this.stateRef.canvasHeight - height) / 2)),
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
        this.markStateMutated();
        this.patchState({ selectedElementId: element.id }, { skipEmit: true });

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
        const nextSelected = this.stateRef.selectedElementId === id ? null : this.stateRef.selectedElementId;
        this.markStateMutated();
        this.patchState({ selectedElementId: nextSelected }, { skipEmit: true });
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

        this.markStateMutated();

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
        this.markStateMutated();
        this.applyContainerLayout(containerId);
        this.commitHistory();
    }

    setDraggedElement(id: string | null) {
        if (this.stateRef.draggedElementId === id) return;
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
            this.markStateMutated();
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

        this.markStateMutated();
        if (!options?.silent) {
            this.emitState();
        }
    }

    moveElement(elementId: string, position: Partial<Pick<LayoutElement, "x" | "y">>, options?: MoveElementOptions) {
        if (typeof position.x !== "number" && typeof position.y !== "number") return;
        const element = this.tree.getElement(elementId);
        if (!element) return;
        const maxX = Math.max(0, this.stateRef.canvasWidth - element.width);
        const maxY = Math.max(0, this.stateRef.canvasHeight - element.height);
        const nextX = typeof position.x === "number" ? clamp(position.x, 0, maxX) : element.x;
        const nextY = typeof position.y === "number" ? clamp(position.y, 0, maxY) : element.y;
        const deltaX = nextX - element.x;
        const deltaY = nextY - element.y;
        if (!deltaX && !deltaY) return;
        this.tree.update(elementId, current => {
            current.x = nextX;
            current.y = nextY;
        });
        if (options?.cascadeChildren ?? true) {
            this.offsetChildrenInternal(elementId, deltaX, deltaY);
        }
        this.markStateMutated();
        this.emitState(options);
    }

    resizeElement(
        elementId: string,
        size: Partial<Pick<LayoutElement, "width" | "height">>,
        options?: MutationOptions,
    ) {
        if (typeof size.width !== "number" && typeof size.height !== "number") return;
        const element = this.tree.getElement(elementId);
        if (!element) return;
        const maxWidth = Math.max(MIN_ELEMENT_SIZE, this.stateRef.canvasWidth - element.x);
        const maxHeight = Math.max(MIN_ELEMENT_SIZE, this.stateRef.canvasHeight - element.y);
        const nextWidth = typeof size.width === "number" ? clamp(size.width, MIN_ELEMENT_SIZE, maxWidth) : element.width;
        const nextHeight =
            typeof size.height === "number" ? clamp(size.height, MIN_ELEMENT_SIZE, maxHeight) : element.height;
        if (nextWidth === element.width && nextHeight === element.height) return;
        this.tree.update(elementId, current => {
            current.width = nextWidth;
            current.height = nextHeight;
        });
        this.markStateMutated();
        this.emitState(options);
    }

    offsetChildren(parentId: string, offset: { x?: number; y?: number }, options?: MutationOptions) {
        const offsetX = offset.x ?? 0;
        const offsetY = offset.y ?? 0;
        const changed = this.offsetChildrenInternal(parentId, offsetX, offsetY);
        if (!changed) return;
        this.markStateMutated();
        this.emitState(options);
    }

    applyElementSnapshot(snapshot: LayoutElement, options?: MutationOptions) {
        const current = this.tree.getElement(snapshot.id);
        if (!current) return;
        const patch = this.diffElementSnapshot(current, snapshot);
        if (!patch) return;
        let requiresLayoutReflow = false;
        this.tree.update(snapshot.id, element => {
            if (Object.prototype.hasOwnProperty.call(patch, "label")) {
                element.label = patch.label ?? "";
            }
            if (Object.prototype.hasOwnProperty.call(patch, "description")) {
                element.description = patch.description;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "placeholder")) {
                element.placeholder = patch.placeholder;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "defaultValue")) {
                element.defaultValue = patch.defaultValue;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "options")) {
                element.options = patch.options ? [...patch.options] : undefined;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "attributes")) {
                element.attributes = patch.attributes ? [...patch.attributes] : [];
            }
            if (Object.prototype.hasOwnProperty.call(patch, "layout")) {
                element.layout = patch.layout ? { ...patch.layout } : undefined;
                requiresLayoutReflow = true;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "viewBindingId")) {
                element.viewBindingId = patch.viewBindingId;
            }
            if (Object.prototype.hasOwnProperty.call(patch, "viewState")) {
                element.viewState = patch.viewState ? cloneRecord(patch.viewState) : undefined;
            }
        });
        this.markStateMutated();
        if (requiresLayoutReflow && isContainerType(current.type)) {
            this.applyContainerLayout(snapshot.id, { silent: true });
        }
        this.emitState(options);
    }

    undo() {
        this.history.undo();
        this.markStateMutated();
        this.emitState();
    }

    redo() {
        this.history.redo();
        this.markStateMutated();
        this.emitState();
    }

    pushHistorySnapshot() {
        this.commitHistory();
    }

    applySavedLayout(layout: SavedLayout) {
        this.tree.load(layout.elements);
        this.stateRef.canvasWidth = layout.canvasWidth;
        this.stateRef.canvasHeight = layout.canvasHeight;
        this.stateRef.selectedElementId = null;
        this.stateRef.lastSavedLayoutId = layout.id;
        this.stateRef.lastSavedLayoutName = layout.name;
        this.stateRef.lastSavedLayoutCreatedAt = layout.createdAt;
        this.stateRef.lastSavedLayoutUpdatedAt = layout.updatedAt;
        this.markStateMutated();
        this.history.reset(this.captureSnapshot());
        this.emitState();
    }

    serializeState(): string {
        const elements = this.tree.getElementsSnapshot().map(element => {
            const clone = cloneLayoutElement(element);
            return {
                ...clone,
                x: Math.round(clone.x),
                y: Math.round(clone.y),
                width: Math.round(clone.width),
                height: Math.round(clone.height),
            };
        });
        const payload: LayoutBlueprint & {
            id: string | null;
            name: string | null;
            createdAt: string | null;
            updatedAt: string | null;
        } = {
            canvasWidth: Math.round(this.stateRef.canvasWidth),
            canvasHeight: Math.round(this.stateRef.canvasHeight),
            elements,
            id: this.stateRef.lastSavedLayoutId,
            name: this.stateRef.lastSavedLayoutName.trim() ? this.stateRef.lastSavedLayoutName : null,
            createdAt: this.stateRef.lastSavedLayoutCreatedAt,
            updatedAt: this.stateRef.lastSavedLayoutUpdatedAt ?? this.stateRef.lastSavedLayoutCreatedAt,
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
        if (this.stateRef.isSavingLayout === isSaving) return;
        this.patchState({ isSavingLayout: isSaving });
    }

    setImportingLayout(isImporting: boolean) {
        if (this.stateRef.isImportingLayout === isImporting) return;
        this.patchState({ isImportingLayout: isImporting });
    }

    private captureSnapshot(): LayoutEditorSnapshot {
        return {
            canvasWidth: this.stateRef.canvasWidth,
            canvasHeight: this.stateRef.canvasHeight,
            selectedElementId: this.stateRef.selectedElementId,
            elements: this.tree.getElementsSnapshot().map(cloneLayoutElement),
        };
    }

    private restoreSnapshot(snapshot: LayoutEditorSnapshot) {
        this.tree.load(snapshot.elements);
        this.stateRef.canvasWidth = snapshot.canvasWidth;
        this.stateRef.canvasHeight = snapshot.canvasHeight;
        this.stateRef.selectedElementId = snapshot.selectedElementId;
        this.markStateMutated();
        this.emitState();
    }

    private resolveParentContainer(requestedParentId: string | null): LayoutElement | null {
        if (requestedParentId) {
            const candidate = this.tree.getElement(requestedParentId);
            if (candidate && isContainerType(candidate.type)) {
                return candidate;
            }
        }
        if (this.stateRef.selectedElementId) {
            const selected = this.tree.getElement(this.stateRef.selectedElementId);
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

    private emitState(options?: MutationOptions) {
        if (this.interactionDepth > 0) {
            this.pendingStateEmit = true;
            if (!options?.skipExport) {
                this.pendingSkipExport = false;
            }
            return;
        }
        this.dispatchState(options);
    }

    private dispatchState(options?: MutationOptions) {
        this.updateDerivedFlags();
        const listeners = Array.from(this.listeners);
        for (const listener of listeners) {
            listener({ type: "state", state: this.createSnapshot() });
        }
        if (!options?.skipExport) {
            const payload = this.ensureExportPayload();
            for (const listener of listeners) {
                listener({ type: "export", payload });
            }
        }
    }

    private patchState(patch: Partial<MutableLayoutEditorState>, options?: StatePatchOptions) {
        let changed = false;
        for (const key of Object.keys(patch) as (keyof MutableLayoutEditorState)[]) {
            const value = patch[key];
            if (typeof value === "undefined") continue;
            if (this.stateRef[key] !== value) {
                this.stateRef[key] = value as MutableLayoutEditorState[typeof key];
                changed = true;
            }
        }
        if (changed) {
            this.markStateMutated();
        }
        if (!options?.skipEmit) {
            const emitOptions: MutationOptions | undefined = options?.skipExport ? { skipExport: true } : undefined;
            this.emitState(emitOptions);
        }
    }

    private markStateMutated() {
        this.exportDirty = true;
    }

    private updateDerivedFlags() {
        this.stateRef.canUndo = this.history.canUndo;
        this.stateRef.canRedo = this.history.canRedo;
    }

    private createSnapshot(): LayoutEditorState {
        const elements = this.tree.getElementsSnapshot().map(cloneLayoutElement);
        return {
            canvasWidth: this.stateRef.canvasWidth,
            canvasHeight: this.stateRef.canvasHeight,
            elements,
            selectedElementId: this.stateRef.selectedElementId,
            draggedElementId: this.stateRef.draggedElementId,
            isSavingLayout: this.stateRef.isSavingLayout,
            isImportingLayout: this.stateRef.isImportingLayout,
            lastSavedLayoutId: this.stateRef.lastSavedLayoutId,
            lastSavedLayoutName: this.stateRef.lastSavedLayoutName,
            lastSavedLayoutCreatedAt: this.stateRef.lastSavedLayoutCreatedAt,
            lastSavedLayoutUpdatedAt: this.stateRef.lastSavedLayoutUpdatedAt,
            canUndo: this.history.canUndo,
            canRedo: this.history.canRedo,
        };
    }

    private commitHistory() {
        if (this.history.isRestoring) return;
        this.history.push(this.captureSnapshot());
        this.markStateMutated();
        this.emitState();
    }

    private clampElementsToCanvas() {
        const elements = this.tree.getElementsSnapshot();
        for (const element of elements) {
            const maxX = Math.max(0, this.stateRef.canvasWidth - element.width);
            const maxY = Math.max(0, this.stateRef.canvasHeight - element.height);
            element.x = clamp(element.x, 0, maxX);
            element.y = clamp(element.y, 0, maxY);
            const maxWidth = Math.max(MIN_ELEMENT_SIZE, this.stateRef.canvasWidth - element.x);
            const maxHeight = Math.max(MIN_ELEMENT_SIZE, this.stateRef.canvasHeight - element.y);
            element.width = clamp(element.width, MIN_ELEMENT_SIZE, maxWidth);
            element.height = clamp(element.height, MIN_ELEMENT_SIZE, maxHeight);
        }
        for (const element of elements) {
            if (isContainerType(element.type)) {
                this.applyContainerLayout(element.id, { silent: true });
            }
        }
    }

    private offsetChildrenInternal(parentId: string, offsetX: number, offsetY: number): boolean {
        if (!offsetX && !offsetY) return false;
        const children = this.tree.getChildElements(parentId);
        if (!children.length) return false;
        let changed = false;
        for (const child of children) {
            const nextX = child.x + offsetX;
            const nextY = child.y + offsetY;
            if (nextX !== child.x) {
                child.x = nextX;
                changed = true;
            }
            if (nextY !== child.y) {
                child.y = nextY;
                changed = true;
            }
        }
        return changed;
    }

    private diffElementSnapshot(current: LayoutElement, snapshot: LayoutElement): ElementSnapshotPatch | null {
        let changed = false;
        const patch: ElementSnapshotPatch = {};
        if (snapshot.label !== current.label) {
            patch.label = snapshot.label;
            changed = true;
        }
        if ((snapshot.description ?? undefined) !== (current.description ?? undefined)) {
            patch.description = snapshot.description;
            changed = true;
        }
        if ((snapshot.placeholder ?? undefined) !== (current.placeholder ?? undefined)) {
            patch.placeholder = snapshot.placeholder;
            changed = true;
        }
        if ((snapshot.defaultValue ?? undefined) !== (current.defaultValue ?? undefined)) {
            patch.defaultValue = snapshot.defaultValue;
            changed = true;
        }
        if (!arraysEqual(snapshot.options, current.options)) {
            patch.options = snapshot.options ? [...snapshot.options] : undefined;
            changed = true;
        }
        if (!arraysEqual(snapshot.attributes, current.attributes)) {
            patch.attributes = snapshot.attributes ? [...snapshot.attributes] : [];
            changed = true;
        }
        const snapshotLayout = snapshot.layout ? { ...snapshot.layout } : undefined;
        const currentLayout = current.layout ? { ...current.layout } : undefined;
        if (!shallowEqual(snapshotLayout, currentLayout)) {
            patch.layout = snapshot.layout ? { ...snapshot.layout } : undefined;
            changed = true;
        }
        if ((snapshot.viewBindingId ?? undefined) !== (current.viewBindingId ?? undefined)) {
            patch.viewBindingId = snapshot.viewBindingId;
            changed = true;
        }
        if (!shallowEqual(snapshot.viewState, current.viewState)) {
            patch.viewState = snapshot.viewState ? cloneRecord(snapshot.viewState) : undefined;
            changed = true;
        }
        return changed ? patch : null;
    }
}

function generateElementId() {
    return `element-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function arraysEqual<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): boolean {
    const arrA = a ?? [];
    const arrB = b ?? [];
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
        if (arrA[i] !== arrB[i]) return false;
    }
    return true;
}

function shallowEqual(
    a: Record<string, unknown> | undefined,
    b: Record<string, unknown> | undefined,
): boolean {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        const valA = a[key];
        const valB = b[key];
        if (Array.isArray(valA) && Array.isArray(valB)) {
            if (!arraysEqual(valA, valB)) return false;
            continue;
        }
        if (valA !== valB) return false;
    }
    return true;
}

function cloneRecord<T extends Record<string, unknown>>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
