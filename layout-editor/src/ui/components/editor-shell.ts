import { clamp } from "../../utils";
import { UIComponent } from "./component";

export interface PanelSizeOptions {
    structureWidth: number;
    inspectorWidth: number;
}

interface EditorShellComponentOptions {
    minPanelWidth: number;
    minStageWidth: number;
    resizerSize: number;
    initialSizes: PanelSizeOptions;
    onResizePanels?(sizes: PanelSizeOptions): void;
}

export class EditorShellComponent extends UIComponent<HTMLElement> {
    private headerHost!: HTMLElement;
    private bodyEl!: HTMLElement;
    private structurePanelEl!: HTMLElement;
    private inspectorPanelEl!: HTMLElement;
    private structureHost!: HTMLElement;
    private stageHost!: HTMLElement;
    private inspectorHost!: HTMLElement;
    private structureResizer!: HTMLElement;
    private inspectorResizer!: HTMLElement;

    private structureWidth: number;
    private inspectorWidth: number;

    constructor(private readonly options: EditorShellComponentOptions) {
        super();
        this.structureWidth = options.initialSizes.structureWidth;
        this.inspectorWidth = options.initialSizes.inspectorWidth;
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);

        this.headerHost = host.createDiv({ cls: "sm-le-wrapper" });

        this.bodyEl = host.createDiv({ cls: "sm-le-body" });

        this.structurePanelEl = this.bodyEl.createDiv({ cls: "sm-le-panel sm-le-panel--structure" });
        this.structurePanelEl.createEl("h3", { text: "Struktur" });
        this.structureHost = this.structurePanelEl.createDiv({ cls: "sm-le-structure" });

        this.structureResizer = this.bodyEl.createDiv({ cls: "sm-le-resizer sm-le-resizer--structure" });
        this.structureResizer.setAttr("role", "separator");
        this.structureResizer.setAttr("aria-orientation", "vertical");
        this.structureResizer.tabIndex = 0;
        this.listen(this.structureResizer, "pointerdown", event => this.beginResize(event as PointerEvent, "structure"));

        const stageWrapper = this.bodyEl.createDiv({ cls: "sm-le-stage" });
        this.stageHost = stageWrapper;

        this.inspectorResizer = this.bodyEl.createDiv({ cls: "sm-le-resizer sm-le-resizer--inspector" });
        this.inspectorResizer.setAttr("role", "separator");
        this.inspectorResizer.setAttr("aria-orientation", "vertical");
        this.inspectorResizer.tabIndex = 0;
        this.listen(this.inspectorResizer, "pointerdown", event => this.beginResize(event as PointerEvent, "inspector"));

        this.inspectorPanelEl = this.bodyEl.createDiv({ cls: "sm-le-panel sm-le-panel--inspector" });
        this.inspectorPanelEl.createEl("h3", { text: "Eigenschaften" });
        this.inspectorHost = this.inspectorPanelEl.createDiv({ cls: "sm-le-inspector" });

        this.applyPanelSizes();
    }

    protected onDestroy(): void {
        this.headerHost = null as any;
        this.bodyEl = null as any;
        this.structurePanelEl = null as any;
        this.inspectorPanelEl = null as any;
        this.structureResizer = null as any;
        this.inspectorResizer = null as any;
        this.structureHost = null as any;
        this.stageHost = null as any;
        this.inspectorHost = null as any;
    }

    getHeaderHost(): HTMLElement {
        return this.headerHost;
    }

    getStructureHost(): HTMLElement {
        return this.structureHost;
    }

    getStageHost(): HTMLElement {
        return this.stageHost;
    }

    getInspectorHost(): HTMLElement {
        return this.inspectorHost;
    }

    getStructurePanel(): HTMLElement {
        return this.structurePanelEl;
    }

    getInspectorPanel(): HTMLElement {
        return this.inspectorPanelEl;
    }

    setPanelSizes(sizes: PanelSizeOptions): void {
        this.structureWidth = sizes.structureWidth;
        this.inspectorWidth = sizes.inspectorWidth;
        this.applyPanelSizes();
    }

    private beginResize(event: PointerEvent, target: "structure" | "inspector") {
        if (event.button !== 0) return;
        if (!this.bodyEl) return;
        event.preventDefault();
        const handle = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
        const pointerId = event.pointerId;
        const otherWidth = target === "structure" ? this.inspectorWidth : this.structureWidth;

        handle?.setPointerCapture(pointerId);
        handle?.addClass("is-active");

        const onPointerMove = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            const bodyRect = this.bodyEl.getBoundingClientRect();
            const maxWidth = Math.max(
                this.options.minPanelWidth,
                bodyRect.width - otherWidth - this.options.resizerSize * 2 - this.options.minStageWidth,
            );
            let proposedWidth: number;
            if (target === "structure") {
                proposedWidth = ev.clientX - bodyRect.left - this.options.resizerSize / 2;
                const next = clamp(Math.round(proposedWidth), this.options.minPanelWidth, maxWidth);
                if (next !== this.structureWidth) {
                    this.structureWidth = next;
                    this.applyPanelSizes();
                    this.options.onResizePanels?.({
                        structureWidth: this.structureWidth,
                        inspectorWidth: this.inspectorWidth,
                    });
                }
            } else {
                proposedWidth = bodyRect.right - ev.clientX - this.options.resizerSize / 2;
                const next = clamp(Math.round(proposedWidth), this.options.minPanelWidth, maxWidth);
                if (next !== this.inspectorWidth) {
                    this.inspectorWidth = next;
                    this.applyPanelSizes();
                    this.options.onResizePanels?.({
                        structureWidth: this.structureWidth,
                        inspectorWidth: this.inspectorWidth,
                    });
                }
            }
        };

        const moveTarget: EventTarget = handle ?? window;
        const stopMove = this.listen(moveTarget, "pointermove", onPointerMove as EventListener);
        const stopUp = this.listen(moveTarget, "pointerup", (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            stopMove();
            stopUp();
            handle?.releasePointerCapture(pointerId);
            handle?.removeClass("is-active");
            this.options.onResizePanels?.({
                structureWidth: this.structureWidth,
                inspectorWidth: this.inspectorWidth,
            });
        });

        this.registerCleanup(() => {
            stopMove();
            stopUp();
            handle?.releasePointerCapture(pointerId);
            handle?.removeClass("is-active");
        });
    }

    private applyPanelSizes() {
        if (this.structurePanelEl) {
            const width = Math.max(this.options.minPanelWidth, Math.round(this.structureWidth));
            this.structurePanelEl.style.flex = `0 0 ${width}px`;
            this.structurePanelEl.style.width = `${width}px`;
        }
        if (this.inspectorPanelEl) {
            const width = Math.max(this.options.minPanelWidth, Math.round(this.inspectorWidth));
            this.inspectorPanelEl.style.flex = `0 0 ${width}px`;
            this.inspectorPanelEl.style.width = `${width}px`;
        }
    }
}
