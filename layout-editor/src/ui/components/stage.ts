import { MIN_ELEMENT_SIZE, isContainerType } from "../../definitions";
import { renderElementPreview } from "../../element-preview";
import { LayoutEditorStore } from "../../state/layout-editor-store";
import { LayoutElement } from "../../types";
import { clamp, isContainerElement } from "../../utils";
import { UIComponent, UIComponentScope } from "./component";
import { DiffRenderer } from "./diff-renderer";

export interface StageComponentOptions {
    store: LayoutEditorStore;
    onSelectElement?(id: string | null): void;
    renderPreview?: typeof renderElementPreview;
}

export interface StageCameraViewport {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly scale: number;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
    readonly worldLeft: number;
    readonly worldTop: number;
    readonly worldRight: number;
    readonly worldBottom: number;
}

interface StageCameraEventBase {
    readonly current: StageCameraViewport;
    readonly target: StageCameraViewport;
}

export interface StageCameraCenterEvent extends StageCameraEventBase {
    readonly reason: "initial" | "focus";
    readonly canvas: { width: number; height: number };
    readonly elementId?: string;
}

export interface StageCameraZoomEvent extends StageCameraEventBase {
    readonly factor: number;
    readonly pointer: { clientX: number; clientY: number };
    readonly world: { x: number; y: number };
}

export interface StageCameraScrollEvent extends StageCameraEventBase {
    readonly delta: { x: number; y: number };
    readonly pointerId: number | null;
}

export interface StageCameraObserver {
    onCenter?(event: StageCameraCenterEvent): void;
    onZoom?(event: StageCameraZoomEvent): void;
    onScroll?(event: StageCameraScrollEvent): void;
}

interface InteractionCleanup {
    (): void;
}

interface StageElementCursor {
    readonly element: LayoutElement | null;
    readonly parentId: string | null;
    readonly parent: LayoutElement | null;
    readonly children: readonly LayoutElement[];
    readonly isContainer: boolean;
    readonly parentIsContainer: boolean;
}

export class StageComponent extends UIComponent<HTMLElement> {
    private readonly elementNodes = new Map<string, HTMLElement>();
    private elementsRenderer: DiffRenderer<LayoutElement, HTMLElement> | null = null;
    private canvasEl!: HTMLElement;
    private viewportEl!: HTMLElement;
    private cameraPanEl!: HTMLElement;
    private cameraZoomEl!: HTMLElement;
    private readonly previewRenderer: typeof renderElementPreview;
    private elementSnapshotIndex = new Map<string, LayoutElement>();
    private elementCursorCache = new Map<string, StageElementCursor>();
    private currentElementsSnapshot: LayoutElement[] = [];
    private readonly cameraObservers = new Set<StageCameraObserver>();

    private cameraScale = 1;
    private cameraX = 0;
    private cameraY = 0;
    private selectedElementId: string | null = null;
    private panPointerId: number | null = null;
    private panStartX = 0;
    private panStartY = 0;
    private panOriginX = 0;
    private panOriginY = 0;
    private hasInitializedCamera = false;
    private canvasWidth = 0;
    private canvasHeight = 0;

    constructor(private readonly options: StageComponentOptions) {
        super();
        this.previewRenderer = options.renderPreview ?? renderElementPreview;
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);

        const viewport = host.createDiv({ cls: "sm-le-stage__viewport" });
        this.listen(viewport, "pointerdown", this.onViewportPointerDown);
        this.listen(viewport, "pointermove", this.onViewportPointerMove);
        this.listen(viewport, "pointerup", this.onViewportPointerUp);
        this.listen(viewport, "pointercancel", this.onViewportPointerUp);
        this.listen(viewport, "wheel", this.onViewportWheel as EventListener, { passive: false });

        const cameraPan = viewport.createDiv({ cls: "sm-le-stage__camera" });
        const cameraZoom = cameraPan.createDiv({ cls: "sm-le-stage__zoom" });
        const canvas = cameraZoom.createDiv({ cls: "sm-le-canvas" });
        this.listen(canvas, "pointerdown", event => {
            if (event.target === canvas) {
                this.options.onSelectElement?.(null);
            }
        });

        this.viewportEl = viewport;
        this.cameraPanEl = cameraPan;
        this.cameraZoomEl = cameraZoom;
        this.canvasEl = canvas;
        this.hasInitializedCamera = false;

        this.elementsRenderer = new DiffRenderer<LayoutElement, HTMLElement>(
            this.canvasEl,
            () => this.createScope(),
            {
                getKey: element => element.id,
                create: (element, context) => this.createElementNode(element, context.scope),
                update: (node, element) => this.syncElementNode(node, element),
                destroy: node => {
                    const id = node.dataset.id;
                    if (id) {
                        this.elementNodes.delete(id);
                    }
                },
            },
        );
    }

    protected onDestroy(): void {
        this.elementsRenderer?.clear();
        this.elementsRenderer = null;
        this.elementNodes.clear();
        this.cameraObservers.clear();
        this.clearHost();
    }

    observeCamera(observer: StageCameraObserver): () => void {
        this.cameraObservers.add(observer);
        return () => {
            this.cameraObservers.delete(observer);
        };
    }

    syncStage(elements: LayoutElement[], selectedId: string | null, canvasWidth: number, canvasHeight: number) {
        if (!this.canvasEl) return;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.canvasEl.style.width = `${canvasWidth}px`;
        this.canvasEl.style.height = `${canvasHeight}px`;
        this.selectedElementId = selectedId;
        this.currentElementsSnapshot = elements;
        this.elementSnapshotIndex = new Map(elements.map(element => [element.id, element]));
        this.elementCursorCache.clear();
        this.elementsRenderer?.patch(elements);

        if (!this.hasInitializedCamera) {
            requestAnimationFrame(() => {
                if (this.hasInitializedCamera) return;
                this.centerCamera(canvasWidth, canvasHeight);
                this.hasInitializedCamera = true;
            });
        }
    }

    refreshElement(element: LayoutElement) {
        this.elementSnapshotIndex.set(element.id, element);
        const index = this.currentElementsSnapshot.findIndex(entry => entry.id === element.id);
        if (index === -1) {
            this.currentElementsSnapshot = [...this.currentElementsSnapshot, element];
        } else {
            const next = [...this.currentElementsSnapshot];
            next[index] = element;
            this.currentElementsSnapshot = next;
        }
        this.elementCursorCache.clear();
        const node = this.elementNodes.get(element.id);
        if (node) {
            this.syncElementNode(node, element);
        }
    }

    focusElement(element: LayoutElement) {
        if (!this.viewportEl) return;
        const rect = this.viewportEl.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scale = this.cameraScale || 1;
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        const nextX = Math.round(rect.width / 2 - centerX * scale);
        const nextY = Math.round(rect.height / 2 - centerY * scale);
        this.emitCameraCenter(
            {
                reason: "focus",
                canvas: { width: this.canvasWidth, height: this.canvasHeight },
                elementId: element.id,
            },
            nextX,
            nextY,
            scale,
        );
        this.cameraX = nextX;
        this.cameraY = nextY;
        this.applyCameraTransform();
    }

    private createElementNode(element: LayoutElement, scope: UIComponentScope) {
        const node = this.canvasEl.createDiv({ cls: "sm-le-box" });
        node.dataset.id = element.id;

        const content = node.createDiv({ cls: "sm-le-box__content" });
        content.dataset.role = "content";

        const updateCursor = (event: PointerEvent) => {
            const mode = this.resolveInteractionMode(node, event);
            if (!mode) {
                node.style.cursor = "";
                return;
            }
            if (mode.type === "resize") {
                const cursor = mode.corner === "nw" || mode.corner === "se" ? "nwse-resize" : "nesw-resize";
                node.style.cursor = cursor;
            } else {
                node.style.cursor = "move";
            }
        };

        scope.listen(node, "pointermove", ev => {
            if (ev.buttons) return;
            updateCursor(ev as PointerEvent);
        });

        scope.listen(node, "pointerleave", () => {
            if (node.hasClass("is-interacting")) return;
            node.style.cursor = "";
        });

        scope.listen(node, "pointerdown", ev => {
            const event = ev as PointerEvent;
            this.options.onSelectElement?.(element.id);
            const mode = this.resolveInteractionMode(node, event);
            if (!mode) return;
            event.preventDefault();
            event.stopPropagation();
            node.addClass("is-interacting");
            const cleanup: InteractionCleanup = () => {
                node.removeClass("is-interacting");
                node.style.cursor = "";
            };
            if (mode.type === "resize") {
                this.beginResize(element, event, mode.corner, cleanup);
            } else {
                this.beginMove(element, event, cleanup);
            }
        });

        this.elementNodes.set(element.id, node);
        return node;
    }

    private syncElementNode(node: HTMLElement, element: LayoutElement) {
        node.style.left = `${Math.round(element.x)}px`;
        node.style.top = `${Math.round(element.y)}px`;
        node.style.width = `${Math.round(element.width)}px`;
        node.style.height = `${Math.round(element.height)}px`;
        node.classList.toggle("is-container", isContainerType(element.type));
        node.classList.toggle("is-selected", element.id === this.selectedElementId);
        const contentEl = node.querySelector<HTMLElement>('[data-role="content"]');
        if (contentEl) {
            this.previewRenderer({
                host: contentEl,
                element,
                elements: this.currentElementsSnapshot,
                finalize: target => this.finalizeInlineMutation(target),
                ensureContainerDefaults: target => this.options.store.ensureContainerDefaults(target.id),
                applyContainerLayout: (target, opts) => this.options.store.applyContainerLayout(target.id, opts),
                pushHistory: () => this.options.store.pushHistorySnapshot(),
                createElement: (type, createOptions) => this.options.store.createElement(type, createOptions),
            });
        }
    }

    private finalizeInlineMutation(element: LayoutElement) {
        this.options.store.applyElementSnapshot(element, { skipExport: true });
        if (isContainerType(element.type)) {
            this.options.store.applyContainerLayout(element.id, { silent: true });
        }
        this.options.store.pushHistorySnapshot();
        this.options.store.flushExport();
    }

    private beginMove(element: LayoutElement, event: PointerEvent, onComplete: InteractionCleanup) {
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = element.x;
        const originY = element.y;
        const cursor = this.resolveElementCursor(element.id);
        const isContainer = cursor.isContainer;
        const parentContainerId = cursor.parentIsContainer ? cursor.parentId : null;

        const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            let nextX = originX + dx;
            let nextY = originY + dy;
            const maxX = Math.max(0, this.canvasWidth - element.width);
            const maxY = Math.max(0, this.canvasHeight - element.height);
            nextX = clamp(nextX, 0, maxX);
            nextY = clamp(nextY, 0, maxY);
            this.options.store.runInteraction(() => {
                this.options.store.moveElement(element.id, { x: nextX, y: nextY }, { skipExport: true });
                if (isContainer) {
                    this.options.store.applyContainerLayout(element.id, { silent: true });
                } else if (parentContainerId) {
                    this.options.store.applyContainerLayout(parentContainerId, { silent: true });
                }
            });
        };

        const stopMove = this.listen(window, "pointermove", onMove as EventListener);
        const stopUp = this.listen(window, "pointerup", () => {
            stopMove();
            stopUp();
            if (isContainer) {
                this.options.store.applyContainerLayout(element.id);
            } else if (parentContainerId) {
                this.options.store.applyContainerLayout(parentContainerId);
            }
            this.options.store.pushHistorySnapshot();
            this.options.store.flushExport();
            onComplete();
        });
    }

    private beginResize(
        element: LayoutElement,
        event: PointerEvent,
        corner: "nw" | "ne" | "sw" | "se",
        onComplete: InteractionCleanup,
    ) {
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = element.x;
        const originY = element.y;
        const originW = element.width;
        const originH = element.height;
        const cursor = this.resolveElementCursor(element.id);
        const isContainer = cursor.isContainer;
        const parentContainerId = cursor.parentIsContainer ? cursor.parentId : null;

        const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            let nextX = element.x;
            let nextY = element.y;
            let nextW = element.width;
            let nextH = element.height;

            if (corner === "nw" || corner === "sw") {
                const maxLeft = Math.max(0, originX + originW - MIN_ELEMENT_SIZE);
                const proposedX = clamp(originX + dx, 0, maxLeft);
                nextX = proposedX;
                nextW = originW + (originX - proposedX);
            } else {
                const maxWidth = Math.max(MIN_ELEMENT_SIZE, this.canvasWidth - originX);
                nextW = clamp(originW + dx, MIN_ELEMENT_SIZE, maxWidth);
            }

            if (corner === "nw" || corner === "ne") {
                const maxTop = Math.max(0, originY + originH - MIN_ELEMENT_SIZE);
                const proposedY = clamp(originY + dy, 0, maxTop);
                nextY = proposedY;
                nextH = originH + (originY - proposedY);
            } else {
                const maxHeight = Math.max(MIN_ELEMENT_SIZE, this.canvasHeight - originY);
                nextH = clamp(originH + dy, MIN_ELEMENT_SIZE, maxHeight);
            }

            this.options.store.runInteraction(() => {
                this.options.store.moveElement(
                    element.id,
                    { x: nextX, y: nextY },
                    { skipExport: true, cascadeChildren: false },
                );
                this.options.store.resizeElement(element.id, { width: nextW, height: nextH }, { skipExport: true });

                if (isContainer) {
                    this.options.store.applyContainerLayout(element.id, { silent: true });
                } else if (parentContainerId) {
                    this.options.store.applyContainerLayout(parentContainerId, { silent: true });
                }
            });
        };

        const stopMove = this.listen(window, "pointermove", onMove as EventListener);
        const stopUp = this.listen(window, "pointerup", () => {
            stopMove();
            stopUp();
            if (isContainer) {
                this.options.store.applyContainerLayout(element.id);
            } else if (parentContainerId) {
                this.options.store.applyContainerLayout(parentContainerId);
            }
            this.options.store.pushHistorySnapshot();
            this.options.store.flushExport();
            onComplete();
        });
    }

    private resolveInteractionMode(
        el: HTMLElement,
        event: PointerEvent,
    ): { type: "move" } | { type: "resize"; corner: "nw" | "ne" | "sw" | "se" } | null {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const margin = Math.min(14, rect.width / 2, rect.height / 2);
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) return null;
        const nearLeft = offsetX <= margin;
        const nearRight = rect.width - offsetX <= margin;
        const nearTop = offsetY <= margin;
        const nearBottom = rect.height - offsetY <= margin;
        if (nearLeft && nearTop) return { type: "resize", corner: "nw" };
        if (nearRight && nearTop) return { type: "resize", corner: "ne" };
        if (nearLeft && nearBottom) return { type: "resize", corner: "sw" };
        if (nearRight && nearBottom) return { type: "resize", corner: "se" };
        if (nearLeft || nearRight || nearTop || nearBottom) return { type: "move" };
        return null;
    }

    private resolveElementCursor(elementId: string): StageElementCursor {
        const cached = this.elementCursorCache.get(elementId);
        if (cached) {
            return cached;
        }
        const element = this.elementSnapshotIndex.get(elementId) ?? null;
        const parentId = element?.parentId ?? null;
        const parent = parentId ? this.elementSnapshotIndex.get(parentId) ?? null : null;
        const children = element?.children
            ?.map(childId => this.elementSnapshotIndex.get(childId) ?? null)
            .filter((child): child is LayoutElement => !!child) ?? [];
        const cursor: StageElementCursor = {
            element,
            parentId,
            parent,
            children,
            isContainer: element ? isContainerType(element.type) : false,
            parentIsContainer: !!(parent && isContainerElement(parent)),
        };
        this.elementCursorCache.set(elementId, cursor);
        return cursor;
    }

    private onViewportPointerDown = (event: PointerEvent) => {
        if (event.button !== 1 && !(event.button === 0 && event.altKey)) return;
        if (!this.viewportEl) return;
        event.preventDefault();
        this.panPointerId = event.pointerId;
        this.panStartX = event.clientX;
        this.panStartY = event.clientY;
        this.panOriginX = this.cameraX;
        this.panOriginY = this.cameraY;
        this.viewportEl.setPointerCapture(event.pointerId);
        this.viewportEl.addClass("is-panning");
    };

    private onViewportPointerMove = (event: PointerEvent) => {
        if (this.panPointerId === null) return;
        if (event.pointerId !== this.panPointerId) return;
        const dx = event.clientX - this.panStartX;
        const dy = event.clientY - this.panStartY;
        const nextX = this.panOriginX + dx;
        const nextY = this.panOriginY + dy;
        if (nextX === this.cameraX && nextY === this.cameraY) return;
        this.emitCameraScroll(event.pointerId, nextX, nextY);
        this.cameraX = nextX;
        this.cameraY = nextY;
        this.applyCameraTransform();
    };

    private onViewportPointerUp = (event: PointerEvent) => {
        if (this.panPointerId === null) return;
        if (event.pointerId !== this.panPointerId) return;
        this.viewportEl?.releasePointerCapture(event.pointerId);
        this.viewportEl?.removeClass("is-panning");
        this.panPointerId = null;
    };

    private onViewportWheel = (event: WheelEvent) => {
        if (!event.deltaY) return;
        event.preventDefault();
        const scaleFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        const nextScale = clamp(this.cameraScale * scaleFactor, 0.25, 3);
        if (Math.abs(nextScale - this.cameraScale) < 0.0001) return;
        const rect = this.viewportEl.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const worldX = (pointerX - this.cameraX) / this.cameraScale;
        const worldY = (pointerY - this.cameraY) / this.cameraScale;
        const nextX = pointerX - worldX * nextScale;
        const nextY = pointerY - worldY * nextScale;
        this.emitCameraZoom(
            {
                factor: nextScale / this.cameraScale,
                pointer: { clientX: event.clientX, clientY: event.clientY },
                world: { x: worldX, y: worldY },
            },
            nextX,
            nextY,
            nextScale,
        );
        this.cameraScale = nextScale;
        this.cameraX = nextX;
        this.cameraY = nextY;
        this.applyCameraTransform();
    };

    private applyCameraTransform() {
        if (!this.cameraPanEl || !this.cameraZoomEl) return;
        this.cameraPanEl.style.transform = `translate(${Math.round(this.cameraX)}px, ${Math.round(this.cameraY)}px)`;
        this.cameraZoomEl.style.transform = `scale(${this.cameraScale})`;
    }

    private centerCamera(canvasWidth: number, canvasHeight: number) {
        if (!this.viewportEl) return;
        const rect = this.viewportEl.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scaledWidth = canvasWidth * this.cameraScale;
        const scaledHeight = canvasHeight * this.cameraScale;
        const nextX = Math.round((rect.width - scaledWidth) / 2);
        const nextY = Math.round((rect.height - scaledHeight) / 2);
        this.emitCameraCenter(
            {
                reason: "initial",
                canvas: { width: canvasWidth, height: canvasHeight },
            },
            nextX,
            nextY,
            this.cameraScale,
        );
        this.cameraX = nextX;
        this.cameraY = nextY;
        this.applyCameraTransform();
    }

    private emitCameraCenter(meta: Omit<StageCameraCenterEvent, "current" | "target">, x: number, y: number, scale: number) {
        if (!this.cameraObservers.size) return;
        const current = this.describeViewport(this.cameraX, this.cameraY, this.cameraScale);
        const target = this.describeViewport(x, y, scale);
        const event: StageCameraCenterEvent = { ...meta, current, target };
        for (const observer of [...this.cameraObservers]) {
            observer.onCenter?.(event);
        }
    }

    private emitCameraZoom(
        meta: Omit<StageCameraZoomEvent, "current" | "target">,
        x: number,
        y: number,
        scale: number,
    ) {
        if (!this.cameraObservers.size) return;
        const current = this.describeViewport(this.cameraX, this.cameraY, this.cameraScale);
        const target = this.describeViewport(x, y, scale);
        const event: StageCameraZoomEvent = { ...meta, current, target };
        for (const observer of [...this.cameraObservers]) {
            observer.onZoom?.(event);
        }
    }

    private emitCameraScroll(pointerId: number | null, x: number, y: number) {
        if (!this.cameraObservers.size) return;
        const current = this.describeViewport(this.cameraX, this.cameraY, this.cameraScale);
        const target = this.describeViewport(x, y, this.cameraScale);
        const event: StageCameraScrollEvent = {
            current,
            target,
            delta: { x: target.offsetX - current.offsetX, y: target.offsetY - current.offsetY },
            pointerId,
        };
        for (const observer of [...this.cameraObservers]) {
            observer.onScroll?.(event);
        }
    }

    private describeViewport(x: number, y: number, scale: number): StageCameraViewport {
        const rect = this.viewportEl?.getBoundingClientRect();
        const width = rect?.width ?? 0;
        const height = rect?.height ?? 0;
        const safeScale = scale || 1;
        const worldLeft = -x / safeScale;
        const worldTop = -y / safeScale;
        const worldWidth = width / safeScale;
        const worldHeight = height / safeScale;
        return {
            offsetX: x,
            offsetY: y,
            scale: safeScale,
            viewportWidth: width,
            viewportHeight: height,
            worldLeft,
            worldTop,
            worldRight: worldLeft + worldWidth,
            worldBottom: worldTop + worldHeight,
        };
    }
}
