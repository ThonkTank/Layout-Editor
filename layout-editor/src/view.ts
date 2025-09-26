// src/view.ts
import { ItemView } from "obsidian";
import {
    getElementDefinitions,
    onLayoutElementDefinitionsChanged,
} from "./definitions";
import { AttributePopoverController } from "./attribute-popover";
import { renderInspectorPanel } from "./inspector-panel";
import { LayoutElement, LayoutElementDefinition } from "./types";
import { onViewBindingsChanged } from "./view-registry";
import { LayoutEditorStore, LayoutEditorState } from "./state/layout-editor-store";
import { StageController } from "./presenters/stage-controller";
import { StructurePanelPresenter } from "./presenters/structure-panel";
import { HeaderControlsPresenter } from "./presenters/header-controls";
import { EditorShellComponent, PanelSizeOptions } from "./ui/components/editor-shell";
import { renderComponent } from "./ui/components/component";

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
    private shell: EditorShellComponent | null = null;
    private inspectorHost: HTMLElement | null = null;

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
        this.shell?.destroy();
        this.shell = null;
        this.inspectorHost = null;
        this.contentEl.empty();
        this.contentEl.removeClass("sm-layout-editor");
    }

    private render() {
        const root = this.contentEl;
        root.empty();

        const shell = new EditorShellComponent({
            minPanelWidth: this.minPanelWidth,
            minStageWidth: this.minStageWidth,
            resizerSize: this.resizerSize,
            initialSizes: {
                structureWidth: this.structureWidth,
                inspectorWidth: this.inspectorWidth,
            },
            onResizePanels: sizes => this.onShellResize(sizes),
        });
        this.shell = renderComponent(root, shell);

        this.headerPresenter = new HeaderControlsPresenter({
            host: shell.getHeaderHost(),
            store: this.store,
            app: this.app,
        });

        this.stageController = new StageController({
            host: shell.getStageHost(),
            store: this.store,
            onSelectElement: id => this.handleSelectElement(id),
        });

        this.inspectorHost = shell.getInspectorHost();
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
            host: shell.getStructureHost(),
            store: this.store,
            stage: this.stageController,
            onSelectElement: id => this.handleSelectElement(id),
        });
        shell.setPanelSizes({
            structureWidth: this.structureWidth,
            inspectorWidth: this.inspectorWidth,
        });
    }

    private handleStateChange(state: LayoutEditorState) {
        if (state.selectedElementId !== this.currentSelectionId) {
            if (this.currentSelectionId && this.currentSelectionId !== state.selectedElementId) {
                this.attributePopover.close();
            }
            this.currentSelectionId = state.selectedElementId;
        }
        this.renderInspector(state);
        this.shell?.setPanelSizes({
            structureWidth: this.structureWidth,
            inspectorWidth: this.inspectorWidth,
        });
        this.attributePopover.refresh();
    }

    private onShellResize(sizes: PanelSizeOptions) {
        this.structureWidth = sizes.structureWidth;
        this.inspectorWidth = sizes.inspectorWidth;
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
