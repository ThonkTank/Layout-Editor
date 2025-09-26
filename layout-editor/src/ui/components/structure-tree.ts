import { getElementTypeLabel } from "../../definitions";
import { LayoutElement } from "../../types";
import { collectDescendantIds, isContainerElement } from "../../utils";
import { UIComponent } from "./component";

export interface StructureTreeComponentOptions {
    onSelect?(id: string): void;
    onReparent?(payload: { elementId: string; nextParentId: string | null }): void;
    onReorder?(payload: { elementId: string; targetId: string; position: "before" | "after" }): void;
    onDragStateChange?(elementId: string | null): void;
}

export interface StructureTreeState {
    elements: LayoutElement[];
    selectedId: string | null;
    draggedElementId: string | null;
}

type DropIntent =
    | { type: "reparent"; parentId: string | null }
    | { type: "reorder"; targetId: string; position: "before" | "after" };

export class StructureTreeComponent extends UIComponent<HTMLElement> {
    private elements: LayoutElement[] = [];
    private selectedId: string | null = null;
    private draggedElementId: string | null = null;
    private entryElements = new Map<string, HTMLElement>();
    private rootDropZone: HTMLElement | null = null;
    private transientCleanups: Array<() => void> = [];

    constructor(private readonly options: StructureTreeComponentOptions) {
        super();
    }

    protected onMount(host: HTMLElement): void {
        this.renderTree(host);
    }

    protected onDestroy(): void {
        this.entryElements.clear();
        this.rootDropZone = null;
        this.flushTransientCleanups();
    }

    setState(state: StructureTreeState) {
        this.elements = state.elements;
        this.selectedId = state.selectedId;
        this.draggedElementId = state.draggedElementId;
        this.renderTree();
    }

    private renderTree(hostArg?: HTMLElement) {
        const host = hostArg ?? (() => {
            try {
                return this.requireHost();
            } catch {
                return null;
            }
        })();
        if (!host) return;

        this.flushTransientCleanups();
        this.clearHost(host);
        this.entryElements.clear();
        this.rootDropZone = null;

        if (!this.elements.length) {
            host.createDiv({ cls: "sm-le-empty", text: "Noch keine Elemente." });
            return;
        }

        const elementById = new Map(this.elements.map(element => [element.id, element]));
        const childrenByParent = new Map<string | null, LayoutElement[]>();

        for (const element of this.elements) {
            const parentExists = element.parentId && elementById.has(element.parentId) ? element.parentId : null;
            const key = parentExists ?? null;
            const bucket = childrenByParent.get(key);
            if (bucket) {
                bucket.push(element);
            } else {
                childrenByParent.set(key, [element]);
            }
        }

        for (const element of this.elements) {
            if (!isContainerElement(element) || !element.children?.length) continue;
            const list = childrenByParent.get(element.id);
            if (!list) continue;
            const lookup = new Map(list.map(child => [child.id, child]));
            const ordered: LayoutElement[] = [];
            for (const childId of element.children) {
                const child = lookup.get(childId);
                if (child) {
                    ordered.push(child);
                    lookup.delete(childId);
                }
            }
            for (const child of list) {
                if (lookup.has(child.id)) {
                    ordered.push(child);
                }
            }
            childrenByParent.set(element.id, ordered);
        }

        this.rootDropZone = host.createDiv({
            cls: "sm-le-structure__root-drop",
            text: "Ziehe ein Element hierher, um es aus seinem Container zu lösen.",
        });

        this.registerRootDropZone(elementById);

        this.renderLevel(null, host, childrenByParent, elementById);
    }

    private renderLevel(
        parentId: string | null,
        container: HTMLElement,
        childrenByParent: Map<string | null, LayoutElement[]>,
        elementById: Map<string, LayoutElement>,
    ) {
        const children = childrenByParent.get(parentId);
        if (!children || !children.length) return;
        const listEl = container.createEl("ul", { cls: "sm-le-structure__list" });
        for (const child of children) {
            const itemEl = listEl.createEl("li", { cls: "sm-le-structure__item" });
            const entry = itemEl.createEl("button", { cls: "sm-elements-button sm-le-structure__entry", text: "" });
            entry.type = "button";
            entry.dataset.id = child.id;
            if (this.selectedId === child.id) {
                entry.addClass("is-selected");
            }
            if (isContainerElement(child)) {
                entry.addClass("sm-le-structure__entry--container");
            }
            entry.addClass("is-draggable");
            entry.draggable = true;
            this.entryElements.set(child.id, entry);

            const name = child.label?.trim() || getElementTypeLabel(child.type);
            entry.createSpan({ cls: "sm-le-structure__title", text: name });
            const parentElement = child.parentId ? elementById.get(child.parentId) ?? null : null;
            const metaParts: string[] = [getElementTypeLabel(child.type)];
            if (parentElement) {
                const parentName = parentElement.label?.trim() || getElementTypeLabel(parentElement.type);
                metaParts.push(`Übergeordnet: ${parentName}`);
            }
            if (isContainerElement(child)) {
                const count = child.children?.length ?? 0;
                const label = count === 1 ? "1 Kind" : `${count} Kinder`;
                metaParts.push(label);
            }
            entry.createSpan({ cls: "sm-le-structure__meta", text: metaParts.join(" • ") });

            this.trackCleanup(
                this.listen(entry, "click", event => {
                    event.preventDefault();
                    this.options.onSelect?.(child.id);
                }),
            );

            this.trackCleanup(
                this.listen(entry, "dragstart", dragEvent => {
                    this.updateDragState(child.id, true);
                    dragEvent.dataTransfer?.setData("text/plain", child.id);
                    if (dragEvent.dataTransfer) {
                        dragEvent.dataTransfer.effectAllowed = "move";
                    }
                }),
            );

            this.trackCleanup(
                this.listen(entry, "dragend", () => {
                    this.updateDragState(null, true);
                    this.clearDropHighlights();
                }),
            );

            this.trackCleanup(
                this.listen(entry, "dragenter", dragEvent => {
                    const intent = this.resolveDropIntent(entry, child, dragEvent as DragEvent);
                    if (!intent) return;
                    dragEvent.preventDefault();
                    this.applyDropIndicator(entry, intent);
                }),
            );

            this.trackCleanup(
                this.listen(entry, "dragover", dragEvent => {
                    const intent = this.resolveDropIntent(entry, child, dragEvent as DragEvent);
                    if (!intent) {
                        return;
                    }
                    dragEvent.preventDefault();
                    if (dragEvent.dataTransfer) {
                        dragEvent.dataTransfer.dropEffect = "move";
                    }
                    this.applyDropIndicator(entry, intent);
                }),
            );

            this.trackCleanup(
                this.listen(entry, "dragleave", dragEvent => {
                    const related = dragEvent.relatedTarget as HTMLElement | null;
                    if (!related || !entry.contains(related)) {
                        this.clearEntryHighlight(entry);
                    }
                }),
            );

            this.trackCleanup(
                this.listen(entry, "drop", dropEvent => {
                    const intent = this.resolveDropIntent(entry, child, dropEvent as DragEvent);
                    if (!intent) return;
                    dropEvent.preventDefault();
                    dropEvent.stopPropagation();
                    const draggedId = this.draggedElementId;
                    if (!draggedId) return;
                    if (intent.type === "reparent") {
                        this.options.onReparent?.({ elementId: draggedId, nextParentId: intent.parentId });
                    } else {
                        this.options.onReorder?.({
                            elementId: draggedId,
                            targetId: intent.targetId,
                            position: intent.position,
                        });
                    }
                    this.updateDragState(null, true);
                    this.clearDropHighlights();
                }),
            );

            this.renderLevel(child.id, itemEl, childrenByParent, elementById);
        }
    }

    private registerRootDropZone(elementById: Map<string, LayoutElement>) {
        if (!this.rootDropZone) return;
        const canDropToRoot = () => {
            if (!this.draggedElementId) return false;
            const dragged = elementById.get(this.draggedElementId);
            if (!dragged) return false;
            return Boolean(dragged.parentId);
        };

        this.trackCleanup(
            this.listen(this.rootDropZone, "dragenter", event => {
                if (!canDropToRoot()) return;
                event.preventDefault();
                this.rootDropZone?.addClass("is-active");
            }),
        );

        this.trackCleanup(
            this.listen(this.rootDropZone, "dragover", event => {
                if (!canDropToRoot()) return;
                event.preventDefault();
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "move";
                }
                this.rootDropZone?.addClass("is-active");
            }),
        );

        this.trackCleanup(
            this.listen(this.rootDropZone, "dragleave", event => {
                const related = event.relatedTarget as HTMLElement | null;
                if (!related || !this.rootDropZone?.contains(related)) {
                    this.rootDropZone?.removeClass("is-active");
                }
            }),
        );

        this.trackCleanup(
            this.listen(this.rootDropZone, "drop", event => {
                if (!canDropToRoot()) return;
                event.preventDefault();
                event.stopPropagation();
                const draggedId = this.draggedElementId;
                if (draggedId) {
                    this.options.onReparent?.({ elementId: draggedId, nextParentId: null });
                }
                this.updateDragState(null, true);
                this.clearDropHighlights();
            }),
        );
    }

    private updateDragState(id: string | null, notify: boolean) {
        if (this.draggedElementId === id) return;
        this.draggedElementId = id;
        if (notify) {
            this.options.onDragStateChange?.(id);
        }
    }

    private resolveDropIntent(entry: HTMLElement, target: LayoutElement, event: DragEvent): DropIntent | null {
        const draggedId = this.draggedElementId;
        if (!draggedId || draggedId === target.id) return null;
        const dragged = this.elements.find(el => el.id === draggedId);
        if (!dragged) return null;
        const rect = entry.getBoundingClientRect();
        if (!rect.height) return null;
        const offset = event.clientY - rect.top;
        const ratio = offset / rect.height;
        const canDropInto = isContainerElement(target) && this.canDropOnContainer(target, dragged);
        if (canDropInto && ratio > 0.3 && ratio < 0.7) {
            return { type: "reparent", parentId: target.id };
        }
        if (dragged.parentId && dragged.parentId === target.parentId) {
            return { type: "reorder", targetId: target.id, position: ratio < 0.5 ? "before" : "after" };
        }
        if (canDropInto) {
            return { type: "reparent", parentId: target.id };
        }
        return null;
    }

    private canDropOnContainer(container: LayoutElement, dragged: LayoutElement) {
        if (!isContainerElement(container)) return false;
        if (dragged.id === container.id) return false;
        if (dragged.parentId === container.id) return false;
        if (isContainerElement(dragged)) {
            const descendants = collectDescendantIds(dragged, this.elements);
            if (descendants.has(container.id)) return false;
        }
        let cursor = container.parentId ? this.elements.find(el => el.id === container.parentId) : null;
        while (cursor) {
            if (cursor.id === dragged.id) return false;
            cursor = cursor.parentId ? this.elements.find(el => el.id === cursor.parentId) : null;
        }
        return true;
    }

    private applyDropIndicator(entry: HTMLElement, intent: DropIntent) {
        this.clearDropHighlights();
        entry.addClass("is-drop-target");
        if (intent.type === "reorder") {
            entry.setAttr("data-drop-position", intent.position);
        } else {
            entry.setAttr("data-drop-position", "inside");
        }
    }

    private clearEntryHighlight(entry: HTMLElement) {
        entry.removeClass("is-drop-target");
        entry.removeAttr("data-drop-position");
    }

    private clearDropHighlights() {
        for (const entry of this.entryElements.values()) {
            this.clearEntryHighlight(entry);
        }
        this.rootDropZone?.removeClass("is-active");
    }

    private trackCleanup(cleanup: () => void) {
        this.transientCleanups.push(cleanup);
    }

    private flushTransientCleanups() {
        for (const cleanup of this.transientCleanups.splice(0)) {
            cleanup();
        }
    }
}
