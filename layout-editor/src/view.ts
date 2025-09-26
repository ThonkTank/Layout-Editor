// src/view.ts
import { ItemView } from "obsidian";
import {
    getElementDefinitions,
    onLayoutElementDefinitionsChanged,
} from "./definitions";
import { AttributePopoverController } from "./attribute-popover";
import { renderInspectorPanel } from "./inspector-panel";
import { LayoutElement, LayoutElementDefinition } from "./types";
import { clamp } from "./utils";
import { onViewBindingsChanged } from "./view-registry";
import { LayoutEditorStore, LayoutEditorState } from "./state/layout-editor-store";
import { StageController } from "./presenters/stage-controller";
import { StructurePanelPresenter } from "./presenters/structure-panel";
import { HeaderControlsPresenter } from "./presenters/header-controls";

export const VIEW_LAYOUT_EDITOR = "salt-layout-editor";

export class LayoutEditorView extends ItemView {
    private readonly store = new LayoutEditorStore();
    private elementDefinitions: LayoutElementDefinition[] = getElementDefinitions();

    private structureWidth = 260;
    private inspectorWidth = 320;
    private readonly minPanelWidth = 200;
    private readonly minStageWidth = 320;
    private readonly resizerSize = 6;

    private headerPresenter: HeaderControlsPresenter | null = null;
    private stageController: StageController | null = null;
    private structurePresenter: StructurePanelPresenter | null = null;
    private inspectorHost: HTMLElement | null = null;
    private structurePanelEl: HTMLElement | null = null;
    private inspectorPanelEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;

    private disposeDefinitionListener: (() => void) | null = null;
    private disposeViewBindingListener: (() => void) | null = null;
    private storeUnsubscribe: (() => void) | null = null;
    private currentSelectionId: string | null = null;

    private readonly attributePopover = new AttributePopoverController({
        getElementById: id => this.store.getState().elements.find(el => el.id === id),
        syncElementElement: element => this.stageController?.refreshElement(element),
        refreshExport: () => {},
        renderInspector: () => this.renderInspector(),
        updateStatus: () => {},
        pushHistory: () => this.store.pushHistorySnapshot(),
    });

    getViewType() { return VIEW_LAYOUT_EDITOR; }
    getDisplayText() { return "Layout Editor"; }
    getIcon() { return "layout-grid" as any; }

    async onOpen() {
        this.contentEl.addClass("sm-layout-editor");
        this.render();
        this.headerPresenter?.setElementDefinitions(this.elementDefinitions);
        this.storeUnsubscribe = this.store.subscribe(event => {
            if (event.type === "state") {
                this.handleStateChange(event.state);
            }
        });
        this.disposeDefinitionListener = onLayoutElementDefinitionsChanged(defs => {
            this.elementDefinitions = defs;
            this.headerPresenter?.setElementDefinitions(defs);
            this.renderInspector();
        });
        this.disposeViewBindingListener = onViewBindingsChanged(() => {
            this.renderInspector();
        });
        this.registerDomEvent(window, "keydown", this.onKeyDown);
    }

    async onClose() {
        this.attributePopover.close();
        this.headerPresenter?.dispose();
        this.headerPresenter = null;
        this.structurePresenter?.dispose();
        this.structurePresenter = null;
        this.stageController?.dispose();
        this.stageController = null;
        this.storeUnsubscribe?.();
        this.storeUnsubscribe = null;
        this.disposeDefinitionListener?.();
        this.disposeDefinitionListener = null;
        this.disposeViewBindingListener?.();
        this.disposeViewBindingListener = null;
        this.structurePanelEl = null;
        this.inspectorPanelEl = null;
        this.inspectorHost = null;
        this.bodyEl = null;
        this.contentEl.empty();
        this.contentEl.removeClass("sm-layout-editor");
    }

    private render() {
        const root = this.contentEl;
        root.empty();

        const headerHost = root.createDiv({ cls: "sm-le-wrapper" });
        this.headerPresenter = new HeaderControlsPresenter({ host: headerHost, store: this.store, app: this.app });

        this.bodyEl = root.createDiv({ cls: "sm-le-body" });

        this.structurePanelEl = this.bodyEl.createDiv({ cls: "sm-le-panel sm-le-panel--structure" });
        this.structurePanelEl.createEl("h3", { text: "Struktur" });
        const structureHost = this.structurePanelEl.createDiv({ cls: "sm-le-structure" });

        const leftResizer = this.bodyEl.createDiv({ cls: "sm-le-resizer sm-le-resizer--structure" });
        leftResizer.setAttr("role", "separator");
        leftResizer.setAttr("aria-orientation", "vertical");
        leftResizer.tabIndex = 0;
        leftResizer.onpointerdown = event => this.beginResizePanel(event, "structure");

        const stageWrapper = this.bodyEl.createDiv({ cls: "sm-le-stage" });
        this.stageController = new StageController({
            host: stageWrapper,
            store: this.store,
            onSelectElement: id => this.handleSelectElement(id),
        });

        const rightResizer = this.bodyEl.createDiv({ cls: "sm-le-resizer sm-le-resizer--inspector" });
        rightResizer.setAttr("role", "separator");
        rightResizer.setAttr("aria-orientation", "vertical");
        rightResizer.tabIndex = 0;
        rightResizer.onpointerdown = event => this.beginResizePanel(event, "inspector");

        this.inspectorPanelEl = this.bodyEl.createDiv({ cls: "sm-le-panel sm-le-panel--inspector" });
        this.inspectorPanelEl.createEl("h3", { text: "Eigenschaften" });
        this.inspectorHost = this.inspectorPanelEl.createDiv({ cls: "sm-le-inspector" });
        this.registerDomEvent(this.inspectorHost, "sm-layout-open-attributes" as any, (ev: Event) => {
            const detail = (ev as CustomEvent<{ elementId: string; anchor: HTMLElement }>).detail;
            if (!detail) return;
            const element = this.store.getState().elements.find(el => el.id === detail.elementId);
            if (element) {
                this.attributePopover.open(element, detail.anchor);
                this.attributePopover.position();
            }
        });

        this.structurePresenter = new StructurePanelPresenter({
            host: structureHost,
            store: this.store,
            stage: this.stageController,
            onSelectElement: id => this.handleSelectElement(id),
        });

        this.applyPanelSizes();
    }

    private handleStateChange(state: LayoutEditorState) {
        if (state.selectedElementId !== this.currentSelectionId) {
            if (this.currentSelectionId && this.currentSelectionId !== state.selectedElementId) {
                this.attributePopover.close();
            }
            this.currentSelectionId = state.selectedElementId;
        }
        this.renderInspector(state);
        this.applyPanelSizes();
        this.attributePopover.refresh();
    }

    private handleSelectElement(id: string | null) {
        this.attributePopover.close();
        this.store.selectElement(id);
        this.renderInspector();
    }

    private renderInspector(state?: LayoutEditorState) {
        if (!this.inspectorHost) return;
        const current = state ?? this.store.getState();
        const element = current.selectedElementId
            ? current.elements.find(el => el.id === current.selectedElementId) ?? null
            : null;
        renderInspectorPanel({
            host: this.inspectorHost,
            element: element ?? null,
            elements: current.elements,
            definitions: this.elementDefinitions,
            canvasWidth: current.canvasWidth,
            canvasHeight: current.canvasHeight,
            callbacks: {
                ensureContainerDefaults: target => this.store.ensureContainerDefaults(target.id),
                assignElementToContainer: (elementId, containerId) =>
                    this.store.assignElementToContainer(elementId, containerId),
                syncElementElement: target => this.stageController?.refreshElement(target),
                refreshExport: () => {},
                updateStatus: () => {},
                pushHistory: () => this.store.pushHistorySnapshot(),
                renderInspector: () => this.renderInspector(),
                applyContainerLayout: (target, options) => this.store.applyContainerLayout(target.id, options),
                createElement: (type, options) => this.store.createElement(type, options),
                moveChildInContainer: (container, childId, offset) =>
                    this.store.moveChildInContainer(container.id, childId, offset),
                deleteElement: id => this.deleteElement(id),
            },
        });
    }

    private deleteElement(id: string) {
        if (this.attributePopover.activeElementId === id) {
            this.attributePopover.close();
        }
        this.store.deleteElement(id);
    }

    private applyPanelSizes() {
        if (this.structurePanelEl) {
            const width = Math.max(this.minPanelWidth, Math.round(this.structureWidth));
            this.structurePanelEl.style.flex = `0 0 ${width}px`;
            this.structurePanelEl.style.width = `${width}px`;
        }
        if (this.inspectorPanelEl) {
            const width = Math.max(this.minPanelWidth, Math.round(this.inspectorWidth));
            this.inspectorPanelEl.style.flex = `0 0 ${width}px`;
            this.inspectorPanelEl.style.width = `${width}px`;
        }
    }

    private beginResizePanel(event: PointerEvent, target: "structure" | "inspector") {
        if (event.button !== 0) return;
        if (!this.bodyEl) return;
        event.preventDefault();
        const handle = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
        const pointerId = event.pointerId;
        const otherWidth = target === "structure" ? this.inspectorWidth : this.structureWidth;
        const onPointerMove = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            const bodyRect = this.bodyEl!.getBoundingClientRect();
            const maxWidth = Math.max(
                this.minPanelWidth,
                bodyRect.width - otherWidth - this.resizerSize * 2 - this.minStageWidth,
            );
            let proposedWidth: number;
            if (target === "structure") {
                proposedWidth = ev.clientX - bodyRect.left - this.resizerSize / 2;
            } else {
                proposedWidth = bodyRect.right - ev.clientX - this.resizerSize / 2;
            }
            const next = clamp(Math.round(proposedWidth), this.minPanelWidth, maxWidth);
            if (target === "structure") {
                this.structureWidth = next;
            } else {
                this.inspectorWidth = next;
            }
            this.applyPanelSizes();
        };
        const onPointerUp = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            handle?.removeEventListener("pointermove", onPointerMove);
            handle?.removeEventListener("pointerup", onPointerUp);
            handle?.releasePointerCapture(pointerId);
            handle?.removeClass("is-active");
        };
        handle?.setPointerCapture(pointerId);
        handle?.addClass("is-active");
        handle?.addEventListener("pointermove", onPointerMove);
        handle?.addEventListener("pointerup", onPointerUp);
    }

    private onKeyDown = (ev: KeyboardEvent) => {
        if (this.isEditingTarget(ev.target)) return;
        const key = ev.key.toLowerCase();
        const isModifier = ev.metaKey || ev.ctrlKey;
        if (key === "delete") {
            const selected = this.store.getState().selectedElementId;
            if (selected) {
                ev.preventDefault();
                this.deleteElement(selected);
            }
            return;
        }
        if (!isModifier) return;
        if (key === "z") {
            ev.preventDefault();
            if (ev.shiftKey) {
                this.store.redo();
            } else {
                this.store.undo();
            }
        }
    };

    private isEditingTarget(target: EventTarget | null): boolean {
        if (!target) return false;
        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
        ) {
            return true;
        }
        if (target instanceof HTMLElement && target.isContentEditable) {
            return true;
        }
        return false;
    }
}
