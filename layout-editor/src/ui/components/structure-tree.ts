import { getElementTypeLabel } from "../../definitions";
import { LayoutElement } from "../../types";
import { collectDescendantIds, isContainerElement } from "../../utils";
import { UIComponent, UIComponentScope } from "./component";
import { DiffRenderer } from "./diff-renderer";

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

interface TreeEntryMetadata {
    entryEl: HTMLButtonElement;
    titleEl: HTMLElement;
    metaEl: HTMLElement;
    childListEl: HTMLUListElement;
    childRenderer: DiffRenderer<LayoutElement, HTMLLIElement>;
}

export class StructureTreeComponent extends UIComponent<HTMLElement> {
    private elements: LayoutElement[] = [];
    private selectedId: string | null = null;
    private draggedElementId: string | null = null;
    private entryElements = new Map<string, HTMLButtonElement>();
    private entryMetadata = new Map<string, TreeEntryMetadata>();
    private rootDropZone: HTMLElement | null = null;
    private rootDropZoneScope: UIComponentScope | null = null;
    private emptyStateEl: HTMLElement | null = null;
    private rootListEl: HTMLUListElement | null = null;
    private rootRenderer: DiffRenderer<LayoutElement, HTMLLIElement> | null = null;
    private elementIndex: Map<string, LayoutElement> = new Map();
    private childrenIndex: Map<string | null, LayoutElement[]> = new Map();

    constructor(private readonly options: StructureTreeComponentOptions) {
        super();
    }

    protected onMount(host: HTMLElement): void {
        this.initializeHost(host);
        this.renderTree();
    }

    protected onDestroy(): void {
        this.rootRenderer?.clear();
        this.rootRenderer = null;
        this.rootDropZoneScope?.dispose();
        this.rootDropZoneScope = null;
        this.entryElements.clear();
        this.entryMetadata.clear();
        this.elementIndex.clear();
        this.childrenIndex.clear();
        this.rootDropZone = null;
        this.emptyStateEl = null;
        this.rootListEl = null;
        this.clearHost();
    }

    setState(state: StructureTreeState) {
        this.elements = state.elements;
        this.selectedId = state.selectedId;
        this.draggedElementId = state.draggedElementId;
        this.renderTree();
    }

    private initializeHost(host: HTMLElement) {
        this.clearHost(host);
        this.emptyStateEl = host.createDiv({ cls: "sm-le-empty", text: "Noch keine Elemente." });
        this.rootDropZone = host.createDiv({
            cls: "sm-le-structure__root-drop",
            text: "Ziehe ein Element hierher, um es aus seinem Container zu lösen.",
        });
        this.rootDropZone.style.display = "none";
        this.rootListEl = host.createEl("ul", { cls: "sm-le-structure__list" });
        this.rootListEl.style.display = "none";
        this.rootRenderer = this.createLevelRenderer(this.rootListEl);
        this.rootDropZoneScope = this.createScope();
        this.registerRootDropZone(this.rootDropZoneScope);
    }

    private createLevelRenderer(container: HTMLUListElement) {
        return new DiffRenderer<LayoutElement, HTMLLIElement>(
            container,
            () => this.createScope(),
            {
                getKey: element => element.id,
                create: (element, context) => this.createTreeItem(element, context.scope),
                update: (node, element) => this.updateTreeItem(node, element),
                destroy: (node, context) => this.destroyTreeItem(node, context.value),
            },
        );
    }

    private renderTree() {
        const host = (() => {
            try {
                return this.requireHost();
            } catch {
                return null;
            }
        })();
        if (!host) return;
        if (!this.rootRenderer || !this.rootDropZone || !this.rootListEl || !this.emptyStateEl) {
            this.initializeHost(host);
        }
        if (!this.rootRenderer || !this.rootDropZone || !this.rootListEl || !this.emptyStateEl) return;

        if (!this.elements.length) {
            this.rootRenderer.patch([]);
            this.emptyStateEl.style.display = "";
            this.rootDropZone.style.display = "none";
            this.rootDropZone.removeClass("is-active");
            this.rootListEl.style.display = "none";
            this.clearDropHighlights();
            return;
        }

        this.emptyStateEl.style.display = "none";
        this.rootDropZone.style.display = "";
        this.rootDropZone.removeClass("is-active");
        this.rootListEl.style.display = "";
        this.clearDropHighlights();

        this.buildIndexes();
        this.rootRenderer.patch(this.childrenIndex.get(null) ?? []);
    }

    private buildIndexes() {
        const index = new Map<string, LayoutElement>();
        for (const element of this.elements) {
            index.set(element.id, element);
        }
        const childrenByParent = new Map<string | null, LayoutElement[]>();
        for (const element of this.elements) {
            const parentExists = element.parentId && index.has(element.parentId) ? element.parentId : null;
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
        this.elementIndex = index;
        this.childrenIndex = childrenByParent;
    }

    private createTreeItem(element: LayoutElement, scope: UIComponentScope): HTMLLIElement {
        const itemEl = document.createElement("li");
        itemEl.addClass("sm-le-structure__item");

        const entry = itemEl.createEl("button", { cls: "sm-elements-button sm-le-structure__entry", text: "" });
        entry.type = "button";
        entry.dataset.id = element.id;
        entry.addClass("is-draggable");
        entry.draggable = true;

        const titleEl = entry.createSpan({ cls: "sm-le-structure__title", text: "" });
        const metaEl = entry.createSpan({ cls: "sm-le-structure__meta", text: "" });

        const childListEl = itemEl.createEl("ul", { cls: "sm-le-structure__list" });
        childListEl.style.display = "none";
        const childRenderer = this.createLevelRenderer(childListEl);

        this.entryElements.set(element.id, entry);
        this.entryMetadata.set(element.id, {
            entryEl: entry,
            titleEl,
            metaEl,
            childListEl,
            childRenderer,
        });

        this.bindEntryInteractions(entry, element.id, scope);
        this.updateTreeItem(itemEl as HTMLLIElement, element);
        return itemEl as HTMLLIElement;
    }

    private updateTreeItem(node: HTMLLIElement, element: LayoutElement) {
        const metadata = this.entryMetadata.get(element.id);
        if (!metadata) return;
        metadata.entryEl.dataset.id = element.id;
        metadata.entryEl.classList.toggle("is-selected", this.selectedId === element.id);
        metadata.entryEl.classList.toggle("sm-le-structure__entry--container", isContainerElement(element));

        const name = element.label?.trim() || getElementTypeLabel(element.type);
        metadata.titleEl.setText(name);

        const metaParts: string[] = [getElementTypeLabel(element.type)];
        const parentElement = element.parentId ? this.elementIndex.get(element.parentId) ?? null : null;
        if (parentElement) {
            const parentName = parentElement.label?.trim() || getElementTypeLabel(parentElement.type);
            metaParts.push(`Übergeordnet: ${parentName}`);
        }
        if (isContainerElement(element)) {
            const childCount = this.childrenIndex.get(element.id)?.length ?? 0;
            const label = childCount === 1 ? "1 Kind" : `${childCount} Kinder`;
            metaParts.push(label);
        }
        metadata.metaEl.setText(metaParts.join(" • "));

        const children = this.childrenIndex.get(element.id) ?? [];
        metadata.childListEl.style.display = children.length ? "" : "none";
        metadata.childRenderer.patch(children);
    }

    private destroyTreeItem(node: HTMLLIElement, element: LayoutElement) {
        const metadata = this.entryMetadata.get(element.id);
        if (!metadata) return;
        metadata.childRenderer.clear();
        this.entryElements.delete(element.id);
        this.entryMetadata.delete(element.id);
        this.clearEntryHighlight(metadata.entryEl);
    }

    private bindEntryInteractions(entry: HTMLButtonElement, elementId: string, scope: UIComponentScope) {
        scope.listen(entry, "click", event => {
            event.preventDefault();
            this.options.onSelect?.(elementId);
        });

        scope.listen(entry, "dragstart", dragEvent => {
            this.updateDragState(elementId, true);
            dragEvent.dataTransfer?.setData("text/plain", elementId);
            if (dragEvent.dataTransfer) {
                dragEvent.dataTransfer.effectAllowed = "move";
            }
        });

        scope.listen(entry, "dragend", () => {
            this.updateDragState(null, true);
            this.clearDropHighlights();
        });

        scope.listen(entry, "dragenter", dragEvent => {
            const target = this.elementIndex.get(elementId);
            if (!target) return;
            const intent = this.resolveDropIntent(entry, target, dragEvent as DragEvent);
            if (!intent) return;
            dragEvent.preventDefault();
            this.applyDropIndicator(entry, intent);
        });

        scope.listen(entry, "dragover", dragEvent => {
            const target = this.elementIndex.get(elementId);
            if (!target) return;
            const intent = this.resolveDropIntent(entry, target, dragEvent as DragEvent);
            if (!intent) return;
            dragEvent.preventDefault();
            if (dragEvent.dataTransfer) {
                dragEvent.dataTransfer.dropEffect = "move";
            }
            this.applyDropIndicator(entry, intent);
        });

        scope.listen(entry, "dragleave", dragEvent => {
            const related = dragEvent.relatedTarget as HTMLElement | null;
            if (!related || !entry.contains(related)) {
                this.clearEntryHighlight(entry);
            }
        });

        scope.listen(entry, "drop", dropEvent => {
            const target = this.elementIndex.get(elementId);
            if (!target) return;
            const intent = this.resolveDropIntent(entry, target, dropEvent as DragEvent);
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
        });
    }

    private registerRootDropZone(scope: UIComponentScope) {
        if (!this.rootDropZone) return;

        scope.listen(this.rootDropZone, "dragenter", event => {
            if (!this.canDropToRoot()) return;
            event.preventDefault();
            this.rootDropZone?.addClass("is-active");
        });

        scope.listen(this.rootDropZone, "dragover", event => {
            if (!this.canDropToRoot()) return;
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }
            this.rootDropZone?.addClass("is-active");
        });

        scope.listen(this.rootDropZone, "dragleave", event => {
            const related = event.relatedTarget as HTMLElement | null;
            if (!related || !this.rootDropZone?.contains(related)) {
                this.rootDropZone?.removeClass("is-active");
            }
        });

        scope.listen(this.rootDropZone, "drop", event => {
            if (!this.canDropToRoot()) return;
            event.preventDefault();
            event.stopPropagation();
            const draggedId = this.draggedElementId;
            if (draggedId) {
                this.options.onReparent?.({ elementId: draggedId, nextParentId: null });
            }
            this.updateDragState(null, true);
            this.clearDropHighlights();
        });
    }

    private canDropToRoot(): boolean {
        if (!this.draggedElementId) return false;
        const dragged = this.elementIndex.get(this.draggedElementId);
        if (!dragged) return false;
        return Boolean(dragged.parentId);
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
        const dragged = this.elementIndex.get(draggedId);
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
        let cursor = container.parentId ? this.elementIndex.get(container.parentId) ?? null : null;
        while (cursor) {
            if (cursor.id === dragged.id) return false;
            cursor = cursor.parentId ? this.elementIndex.get(cursor.parentId) ?? null : null;
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
}
