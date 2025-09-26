// src/presenters/structure-panel.ts
import { getElementTypeLabel } from "../definitions";
import { LayoutEditorStore } from "../state/layout-editor-store";
import { LayoutElement } from "../types";
import { collectDescendantIds, isContainerElement } from "../utils";
import { createElementsButton } from "../elements/ui";
import { StageController } from "./stage-controller";

interface StructurePanelOptions {
    host: HTMLElement;
    store: LayoutEditorStore;
    stage: StageController;
    onSelectElement(id: string | null): void;
}

export class StructurePanelPresenter {
    private rootDropZone: HTMLElement | null = null;
    private unsubscribe: (() => void) | null = null;

    constructor(private readonly options: StructurePanelOptions) {
        this.unsubscribe = options.store.subscribe(event => {
            if (event.type === "state") {
                this.render(event.state.elements, event.state.selectedElementId);
            }
        });
    }

    dispose() {
        this.unsubscribe?.();
        this.rootDropZone = null;
    }

    private render(elements: LayoutElement[], selectedId: string | null) {
        const host = this.options.host;
        host.empty();
        this.rootDropZone = null;
        if (!elements.length) {
            host.createDiv({ cls: "sm-le-empty", text: "Noch keine Elemente." });
            return;
        }

        const elementById = new Map(elements.map(element => [element.id, element]));
        const childrenByParent = new Map<string | null, LayoutElement[]>();

        for (const element of elements) {
            const parentExists = element.parentId && elementById.has(element.parentId) ? element.parentId : null;
            const key = parentExists ?? null;
            const bucket = childrenByParent.get(key);
            if (bucket) {
                bucket.push(element);
            } else {
                childrenByParent.set(key, [element]);
            }
        }

        for (const element of elements) {
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
                    lookup.delete(child.id);
                }
            }
            childrenByParent.set(element.id, ordered);
        }

        const rootDropZone = host.createDiv({
            cls: "sm-le-structure__root-drop",
            text: "Ziehe ein Element hierher, um es aus seinem Container zu lösen.",
        });
        this.rootDropZone = rootDropZone;

        const canDropToRoot = () => {
            const draggedId = this.options.store.getState().draggedElementId;
            if (!draggedId) return false;
            const dragged = elementById.get(draggedId);
            if (!dragged) return false;
            return Boolean(dragged.parentId);
        };

        rootDropZone.addEventListener("dragenter", event => {
            if (!canDropToRoot()) return;
            event.preventDefault();
            rootDropZone.addClass("is-active");
        });
        rootDropZone.addEventListener("dragover", event => {
            if (!canDropToRoot()) return;
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }
            rootDropZone.addClass("is-active");
        });
        rootDropZone.addEventListener("dragleave", event => {
            const related = event.relatedTarget as HTMLElement | null;
            if (!related || !rootDropZone.contains(related)) {
                rootDropZone.removeClass("is-active");
            }
        });
        rootDropZone.addEventListener("drop", event => {
            if (!canDropToRoot()) return;
            event.preventDefault();
            event.stopPropagation();
            rootDropZone.removeClass("is-active");
            const draggedId = this.options.store.getState().draggedElementId;
            if (draggedId) {
                this.options.store.assignElementToContainer(draggedId, null);
            }
            this.clearDragState();
        });

        const renderLevel = (parentId: string | null, container: HTMLElement) => {
            const children = childrenByParent.get(parentId);
            if (!children || !children.length) return;
            const listEl = container.createEl("ul", { cls: "sm-le-structure__list" });
            for (const child of children) {
                const itemEl = listEl.createEl("li", { cls: "sm-le-structure__item" });
                const entry = createElementsButton(itemEl, { label: "" });
                entry.addClass("sm-le-structure__entry");
                entry.dataset.id = child.id;
                if (selectedId === child.id) {
                    entry.addClass("is-selected");
                }
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
                    entry.addClass("sm-le-structure__entry--container");
                }
                entry.createSpan({ cls: "sm-le-structure__meta", text: metaParts.join(" • ") });
                entry.onclick = ev => {
                    ev.preventDefault();
                    this.options.onSelectElement(child.id);
                    this.options.stage.focusElement(child);
                };
                entry.draggable = true;
                entry.addClass("is-draggable");
                entry.addEventListener("dragstart", dragEvent => {
                    this.options.store.setDraggedElement(child.id);
                    dragEvent.dataTransfer?.setData("text/plain", child.id);
                    if (dragEvent.dataTransfer) {
                        dragEvent.dataTransfer.effectAllowed = "move";
                    }
                });
                entry.addEventListener("dragend", () => {
                    this.clearDragState();
                });
                if (isContainerElement(child)) {
                    const canDropHere = () => this.canDropOnContainer(child, elements);
                    entry.addEventListener("dragenter", dragEvent => {
                        if (!canDropHere()) return;
                        dragEvent.preventDefault();
                        entry.addClass("is-drop-target");
                    });
                    entry.addEventListener("dragover", dragEvent => {
                        if (!canDropHere()) return;
                        dragEvent.preventDefault();
                        if (dragEvent.dataTransfer) {
                            dragEvent.dataTransfer.dropEffect = "move";
                        }
                        entry.addClass("is-drop-target");
                    });
                    entry.addEventListener("dragleave", dragEvent => {
                        const related = dragEvent.relatedTarget as HTMLElement | null;
                        if (!related || !entry.contains(related)) {
                            entry.removeClass("is-drop-target");
                        }
                    });
                    entry.addEventListener("drop", dragEvent => {
                        if (!canDropHere()) return;
                        dragEvent.preventDefault();
                        dragEvent.stopPropagation();
                        const draggedId = this.options.store.getState().draggedElementId;
                        if (draggedId) {
                            this.options.store.assignElementToContainer(draggedId, child.id);
                        }
                        this.clearDragState();
                    });
                }
                renderLevel(child.id, itemEl);
            }
        };

        renderLevel(null, host);
    }

    private canDropOnContainer(container: LayoutElement, elements: LayoutElement[]) {
        const draggedId = this.options.store.getState().draggedElementId;
        if (!draggedId) return false;
        if (!isContainerElement(container)) return false;
        const dragged = elements.find(el => el.id === draggedId);
        if (!dragged) return false;
        if (dragged.id === container.id) return false;
        if (dragged.parentId === container.id) return false;
        if (isContainerElement(dragged)) {
            const descendants = collectDescendantIds(dragged, elements);
            if (descendants.has(container.id)) return false;
        }
        let cursor = container.parentId ? elements.find(el => el.id === container.parentId) : null;
        while (cursor) {
            if (cursor.id === dragged.id) return false;
            cursor = cursor.parentId ? elements.find(el => el.id === cursor.parentId) : null;
        }
        return true;
    }

    private clearDragState() {
        this.options.store.setDraggedElement(null);
        const host = this.options.host;
        const targets = Array.from(host.querySelectorAll<HTMLElement>(".sm-le-structure__entry.is-drop-target"));
        for (const target of targets) {
            target.removeClass("is-drop-target");
        }
        this.rootDropZone?.removeClass("is-active");
    }
}
