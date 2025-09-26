// src/presenters/structure-panel.ts
import { LayoutEditorStore } from "../state/layout-editor-store";
import { LayoutElement } from "../types";
import { isContainerElement } from "../utils";
import { renderComponent } from "../ui/components/component";
import {
    StructureTreeComponent,
    type StructureTreeState,
} from "../ui/components/structure-tree";
import { StageController } from "./stage-controller";

interface StructurePanelOptions {
    host: HTMLElement;
    store: LayoutEditorStore;
    stage: StageController;
    onSelectElement(id: string | null): void;
}

export class StructurePanelPresenter {
    private readonly tree: StructureTreeComponent;
    private unsubscribe: (() => void) | null = null;

    constructor(private readonly options: StructurePanelOptions) {
        this.tree = new StructureTreeComponent({
            onSelect: id => this.handleSelect(id),
            onReparent: payload => this.handleReparent(payload.elementId, payload.nextParentId),
            onReorder: payload => this.handleReorder(payload.elementId, payload.targetId, payload.position),
            onDragStateChange: id => this.options.store.setDraggedElement(id),
        });
        renderComponent(options.host, this.tree);
        const initialState = this.options.store.getState();
        this.tree.setState(this.createStateSnapshot(initialState.elements, initialState.selectedElementId, initialState.draggedElementId));
        this.unsubscribe = options.store.subscribe(event => {
            if (event.type === "state") {
                this.tree.setState(
                    this.createStateSnapshot(event.state.elements, event.state.selectedElementId, event.state.draggedElementId),
                );
            }
        });
    }

    dispose() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.tree.destroy();
    }

    private handleSelect(id: string) {
        this.options.onSelectElement(id);
        const element = this.options.store.getState().elements.find(el => el.id === id);
        if (element) {
            this.options.stage.focusElement(element);
        }
    }

    private handleReparent(elementId: string, nextParentId: string | null) {
        this.options.store.assignElementToContainer(elementId, nextParentId);
    }

    private handleReorder(elementId: string, targetId: string, position: "before" | "after") {
        const state = this.options.store.getState();
        const dragged = state.elements.find(el => el.id === elementId);
        const target = state.elements.find(el => el.id === targetId);
        if (!dragged || !target) return;
        if (!dragged.parentId || dragged.parentId !== target.parentId) return;
        const container = state.elements.find(el => el.id === dragged.parentId);
        if (!container || !isContainerElement(container) || !container.children) return;
        const currentIndex = container.children.indexOf(elementId);
        const targetIndex = container.children.indexOf(targetId);
        if (currentIndex === -1 || targetIndex === -1) return;
        let destinationIndex = targetIndex + (position === "after" ? 1 : 0);
        if (destinationIndex > currentIndex) {
            destinationIndex -= 1;
        }
        const offset = destinationIndex - currentIndex;
        if (offset !== 0) {
            this.options.store.moveChildInContainer(container.id, elementId, offset);
        }
    }

    private createStateSnapshot(
        elements: LayoutElement[],
        selectedId: string | null,
        draggedId: string | null,
    ): StructureTreeState {
        return {
            elements,
            selectedId,
            draggedElementId: draggedId,
        };
    }
}
