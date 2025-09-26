import { MIN_ELEMENT_SIZE } from "../../src/definitions";
import { LayoutEditorStore } from "../../src/state/layout-editor-store";
import type { LayoutTree } from "../../src/model/layout-tree";
import type { LayoutContainerAlign, LayoutElement } from "../../src/types";
import { cloneLayoutElement } from "../../src/utils";

export const CONTAINER_TYPES = ["box-container", "vbox-container", "hbox-container"] as const;
export const ALIGN_VARIANTS: readonly LayoutContainerAlign[] = ["start", "center", "end", "stretch"];

export interface StageViewport {
    width: number;
    height: number;
}

export const STAGE_VIEWPORTS: readonly StageViewport[] = [
    { width: 640, height: 480 },
    { width: 1024, height: 768 },
];

export interface ContainerVariantConfig {
    containerType: (typeof CONTAINER_TYPES)[number];
    align: LayoutContainerAlign;
    stage: StageViewport;
}

export interface ContainerFixture {
    store: LayoutEditorStore;
    containerId: string;
    childId: string;
    stage: StageViewport;
    baseline: {
        container: LayoutElement;
        child: LayoutElement;
    };
}

export interface DragFrameTarget {
    x?: number;
    y?: number;
}

export interface ResizeFrameTarget {
    position?: { x?: number; y?: number };
    size: { width?: number; height?: number };
}

export interface FrameResult {
    beforeRelayout: LayoutElement;
    afterRelayout: LayoutElement;
}

type InternalStore = LayoutEditorStore & { tree: LayoutTree };

function getTree(store: LayoutEditorStore): LayoutTree {
    return (store as InternalStore).tree;
}

export function getElementSnapshot(store: LayoutEditorStore, elementId: string): LayoutElement {
    const element = getTree(store).getElement(elementId);
    if (!element) {
        throw new Error(`Unable to resolve layout element \"${elementId}\" for snapshot capture.`);
    }
    return cloneLayoutElement(element);
}

export function createContainerFixture(config: ContainerVariantConfig): ContainerFixture {
    const store = new LayoutEditorStore();
    store.setCanvasSize(config.stage.width, config.stage.height);
    store.createElement(config.containerType);

    const stateAfterContainer = store.getState();
    const containerId = stateAfterContainer.selectedElementId;
    if (!containerId) {
        throw new Error("Container creation did not select the new element.");
    }

    const tree = getTree(store);
    tree.update(containerId, current => {
        const baseLayout = current.layout ?? { gap: 16, padding: 16, align: "stretch" as LayoutContainerAlign };
        current.layout = { ...baseLayout, align: config.align };
    });

    store.createElement("label", { parentId: containerId });
    store.createElement("text-input", { parentId: containerId });

    store.applyContainerLayout(containerId);

    const snapshot = store.getState();
    const container = snapshot.elements.find(element => element.id === containerId);
    if (!container) {
        throw new Error("Container element vanished after layout application.");
    }

    const firstChild = snapshot.elements.find(element => element.parentId === containerId);
    if (!firstChild) {
        throw new Error("Expected container fixture to expose at least one child element.");
    }

    return {
        store,
        containerId,
        childId: firstChild.id,
        stage: config.stage,
        baseline: {
            container,
            child: firstChild,
        },
    };
}

export function simulateDragFrame(
    store: LayoutEditorStore,
    elementId: string,
    target: DragFrameTarget,
    parentContainerId?: string | null,
): FrameResult {
    let beforeRelayout: LayoutElement | null = null;
    store.runInteraction(() => {
        store.moveElement(elementId, target, { skipExport: true });
        beforeRelayout = getElementSnapshot(store, elementId);
        if (parentContainerId) {
            store.applyContainerLayout(parentContainerId, { silent: true });
        }
    });
    if (!beforeRelayout) {
        throw new Error("Drag frame did not capture intermediate geometry state.");
    }
    const afterRelayout = getElementSnapshot(store, elementId);
    return { beforeRelayout, afterRelayout };
}

export function simulateResizeFrame(
    store: LayoutEditorStore,
    elementId: string,
    target: ResizeFrameTarget,
    parentContainerId?: string | null,
): FrameResult {
    let beforeRelayout: LayoutElement | null = null;
    store.runInteraction(() => {
        if (target.position && (typeof target.position.x === "number" || typeof target.position.y === "number")) {
            store.moveElement(elementId, target.position, { skipExport: true, cascadeChildren: false });
        }
        store.resizeElement(elementId, target.size, { skipExport: true });
        beforeRelayout = getElementSnapshot(store, elementId);
        if (parentContainerId) {
            store.applyContainerLayout(parentContainerId, { silent: true });
        }
    });
    if (!beforeRelayout) {
        throw new Error("Resize frame did not capture intermediate geometry state.");
    }
    const afterRelayout = getElementSnapshot(store, elementId);
    return { beforeRelayout, afterRelayout };
}

export function finalizeDrag(store: LayoutEditorStore, parentContainerId?: string | null): void {
    if (parentContainerId) {
        store.applyContainerLayout(parentContainerId);
    }
    store.pushHistorySnapshot();
    store.flushExport();
}

export function finalizeResize(store: LayoutEditorStore, parentContainerId?: string | null): void {
    if (parentContainerId) {
        store.applyContainerLayout(parentContainerId);
    }
    store.pushHistorySnapshot();
    store.flushExport();
}

export function buildContainerVariantMatrix(): ContainerVariantConfig[] {
    const scenarios: ContainerVariantConfig[] = [];
    for (const stage of STAGE_VIEWPORTS) {
        for (const containerType of CONTAINER_TYPES) {
            for (const align of ALIGN_VARIANTS) {
                scenarios.push({ containerType, align, stage });
            }
        }
    }
    return scenarios;
}

export function clampSizeWithinStage(
    baseline: LayoutElement,
    stage: StageViewport,
    desiredWidthDelta: number,
    desiredHeightDelta: number,
): { width: number; height: number } {
    const maxWidth = stage.width - baseline.x;
    const maxHeight = stage.height - baseline.y;
    const proposedWidth = Math.max(MIN_ELEMENT_SIZE, baseline.width + desiredWidthDelta);
    const proposedHeight = Math.max(MIN_ELEMENT_SIZE, baseline.height + desiredHeightDelta);
    const width = Math.min(Math.max(MIN_ELEMENT_SIZE, proposedWidth), Math.max(MIN_ELEMENT_SIZE, maxWidth));
    const height = Math.min(Math.max(MIN_ELEMENT_SIZE, proposedHeight), Math.max(MIN_ELEMENT_SIZE, maxHeight));
    return { width, height };
}

export function clampPositionWithinStage(
    baseline: LayoutElement,
    stage: StageViewport,
    desiredDeltaX: number,
    desiredDeltaY: number,
): { x: number; y: number } {
    const maxX = stage.width - baseline.width;
    const maxY = stage.height - baseline.height;
    const proposedX = baseline.x + desiredDeltaX;
    const proposedY = baseline.y + desiredDeltaY;
    const x = Math.min(Math.max(0, proposedX), Math.max(0, maxX));
    const y = Math.min(Math.max(0, proposedY), Math.max(0, maxY));
    return { x, y };
}
