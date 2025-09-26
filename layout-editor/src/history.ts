// src/plugins/layout-editor/history.ts
import { LayoutEditorSnapshot, type LayoutElement } from "./types";
import { cloneLayoutElement, elementsAreEqual } from "./utils";

const MAX_HISTORY_ENTRIES = 50;

interface CanvasPatch {
    canvasWidth?: number;
    canvasHeight?: number;
    selectedElementId?: string | null;
}

interface ElementsPatch {
    added?: LayoutElement[];
    removed?: string[];
    updated?: LayoutElement[];
}

interface LayoutPatch {
    canvas?: CanvasPatch;
    elements?: ElementsPatch;
    order?: string[];
}

interface LayoutHistoryEntry {
    redo: LayoutPatch;
    undo: LayoutPatch;
}

export class LayoutHistory {
    private baseline: LayoutEditorSnapshot | null = null;
    private entries: LayoutHistoryEntry[] = [];
    private cursor = 0;
    private currentSnapshot: LayoutEditorSnapshot | null = null;
    private restoring = false;

    constructor(
        private readonly capture: () => LayoutEditorSnapshot,
        private readonly restore: (snapshot: LayoutEditorSnapshot) => void,
    ) {}

    get isRestoring() {
        return this.restoring;
    }

    get canUndo() {
        return this.cursor > 0;
    }

    get canRedo() {
        return this.cursor < this.entries.length;
    }

    reset(initial?: LayoutEditorSnapshot) {
        this.baseline = initial ? cloneSnapshot(initial) : null;
        this.entries = [];
        this.cursor = 0;
        this.currentSnapshot = this.baseline ? cloneSnapshot(this.baseline) : null;
    }

    push(snapshot?: LayoutEditorSnapshot) {
        if (this.restoring) return;
        const nextSnapshot = snapshot ? cloneSnapshot(snapshot) : cloneSnapshot(this.capture());

        if (!this.currentSnapshot) {
            this.baseline = cloneSnapshot(nextSnapshot);
            this.currentSnapshot = cloneSnapshot(nextSnapshot);
            this.entries = [];
            this.cursor = 0;
            return;
        }

        const patchPair = diffSnapshots(this.currentSnapshot, nextSnapshot);
        if (!patchPair) {
            return;
        }

        if (this.cursor < this.entries.length) {
            this.entries.splice(this.cursor);
        }

        this.entries.push(patchPair);
        this.cursor = this.entries.length;
        this.currentSnapshot = nextSnapshot;
        this.enforceLimit();
    }

    undo() {
        if (!this.canUndo || !this.currentSnapshot) return;
        const entry = this.entries[this.cursor - 1];
        if (!entry) return;

        const target = applyPatch(this.currentSnapshot, entry.undo);
        this.cursor -= 1;
        this.currentSnapshot = target;
        this.restoreSnapshot(target);
    }

    redo() {
        if (!this.canRedo || !this.currentSnapshot) return;
        const entry = this.entries[this.cursor];
        if (!entry) return;

        const target = applyPatch(this.currentSnapshot, entry.redo);
        this.cursor += 1;
        this.currentSnapshot = target;
        this.restoreSnapshot(target);
    }

    private enforceLimit() {
        if (!this.baseline) {
            this.baseline = this.currentSnapshot ? cloneSnapshot(this.currentSnapshot) : null;
        }

        while (this.entries.length > MAX_HISTORY_ENTRIES) {
            const removed = this.entries.shift();
            if (!removed || !this.baseline) break;

            this.baseline = applyPatch(this.baseline, removed.redo);
            if (this.cursor > 0) {
                this.cursor -= 1;
            }
        }

        if (!this.currentSnapshot && this.baseline) {
            this.currentSnapshot = cloneSnapshot(this.baseline);
        }
    }

    private restoreSnapshot(snapshot: LayoutEditorSnapshot) {
        this.restoring = true;
        try {
            this.restore(cloneSnapshot(snapshot));
        } finally {
            this.restoring = false;
        }
    }
}

function diffSnapshots(
    previous: LayoutEditorSnapshot,
    next: LayoutEditorSnapshot,
): LayoutHistoryEntry | null {
    const redo: LayoutPatch = {};
    const undo: LayoutPatch = {};

    if (previous.canvasWidth !== next.canvasWidth) {
        redo.canvas ??= {};
        undo.canvas ??= {};
        redo.canvas.canvasWidth = next.canvasWidth;
        undo.canvas.canvasWidth = previous.canvasWidth;
    }

    if (previous.canvasHeight !== next.canvasHeight) {
        redo.canvas ??= {};
        undo.canvas ??= {};
        redo.canvas.canvasHeight = next.canvasHeight;
        undo.canvas.canvasHeight = previous.canvasHeight;
    }

    if (previous.selectedElementId !== next.selectedElementId) {
        redo.canvas ??= {};
        undo.canvas ??= {};
        redo.canvas.selectedElementId = next.selectedElementId ?? null;
        undo.canvas.selectedElementId = previous.selectedElementId ?? null;
    }

    const prevById = new Map(previous.elements.map(element => [element.id, element] as const));
    const nextById = new Map(next.elements.map(element => [element.id, element] as const));

    const added: LayoutElement[] = [];
    const removed: string[] = [];
    const updated: LayoutElement[] = [];
    const undoAdded: LayoutElement[] = [];
    const undoRemoved: string[] = [];
    const undoUpdated: LayoutElement[] = [];

    for (const [id, element] of nextById) {
        const previousElement = prevById.get(id);
        if (!previousElement) {
            added.push(cloneLayoutElement(element));
            undoRemoved.push(id);
            continue;
        }
        if (!elementsAreEqual(previousElement, element)) {
            updated.push(cloneLayoutElement(element));
            undoUpdated.push(cloneLayoutElement(previousElement));
        }
    }

    for (const [id, element] of prevById) {
        if (nextById.has(id)) continue;
        removed.push(id);
        undoAdded.push(cloneLayoutElement(element));
    }

    if (added.length || removed.length || updated.length) {
        redo.elements = {};
        undo.elements = {};
        if (added.length) {
            redo.elements.added = added;
        }
        if (removed.length) {
            redo.elements.removed = removed;
        }
        if (updated.length) {
            redo.elements.updated = updated;
        }
        if (undoRemoved.length) {
            undo.elements.removed = undoRemoved;
        }
        if (undoAdded.length) {
            undo.elements.added = undoAdded;
        }
        if (undoUpdated.length) {
            undo.elements.updated = undoUpdated;
        }
    }

    const previousOrder = previous.elements.map(element => element.id);
    const nextOrder = next.elements.map(element => element.id);
    if (!stringArraysAreEqual(previousOrder, nextOrder)) {
        redo.order = [...nextOrder];
        undo.order = [...previousOrder];
    }

    if (!patchHasChanges(redo)) {
        return null;
    }

    return { redo, undo };
}

function applyPatch(snapshot: LayoutEditorSnapshot, patch: LayoutPatch): LayoutEditorSnapshot {
    let canvasWidth = snapshot.canvasWidth;
    let canvasHeight = snapshot.canvasHeight;
    let selectedElementId = snapshot.selectedElementId;

    if (patch.canvas) {
        if (Object.prototype.hasOwnProperty.call(patch.canvas, "canvasWidth")) {
            canvasWidth = patch.canvas.canvasWidth!;
        }
        if (Object.prototype.hasOwnProperty.call(patch.canvas, "canvasHeight")) {
            canvasHeight = patch.canvas.canvasHeight!;
        }
        if (Object.prototype.hasOwnProperty.call(patch.canvas, "selectedElementId")) {
            selectedElementId = patch.canvas.selectedElementId ?? null;
        }
    }

    const elementMap = new Map<string, LayoutElement>();
    for (const element of snapshot.elements) {
        elementMap.set(element.id, cloneLayoutElement(element));
    }

    const elementPatch = patch.elements;
    if (elementPatch?.removed?.length) {
        for (const id of elementPatch.removed) {
            elementMap.delete(id);
        }
    }

    if (elementPatch?.updated?.length) {
        for (const element of elementPatch.updated) {
            elementMap.set(element.id, cloneLayoutElement(element));
        }
    }

    if (elementPatch?.added?.length) {
        for (const element of elementPatch.added) {
            elementMap.set(element.id, cloneLayoutElement(element));
        }
    }

    const orderSource = patch.order ? [...patch.order] : snapshot.elements.map(element => element.id);
    const elements: LayoutElement[] = [];
    for (const id of orderSource) {
        const element = elementMap.get(id);
        if (!element) continue;
        elements.push(element);
        elementMap.delete(id);
    }

    if (elementMap.size) {
        for (const element of elementMap.values()) {
            elements.push(element);
        }
    }

    return {
        canvasWidth,
        canvasHeight,
        selectedElementId,
        elements,
    };
}

function patchHasChanges(patch: LayoutPatch): boolean {
    if (patch.canvas && Object.keys(patch.canvas).length > 0) return true;
    if (patch.order && patch.order.length > 0) return true;
    if (!patch.elements) return false;
    if (patch.elements.added?.length) return true;
    if (patch.elements.removed?.length) return true;
    if (patch.elements.updated?.length) return true;
    return false;
}

function stringArraysAreEqual(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function cloneSnapshot(snapshot: LayoutEditorSnapshot): LayoutEditorSnapshot {
    return {
        canvasWidth: snapshot.canvasWidth,
        canvasHeight: snapshot.canvasHeight,
        selectedElementId: snapshot.selectedElementId,
        elements: snapshot.elements.map(cloneLayoutElement),
    };
}
