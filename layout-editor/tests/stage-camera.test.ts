import assert from "node:assert/strict";
import { LayoutEditorStore } from "../src/state/layout-editor-store";
import { StageController } from "../src/presenters/stage-controller";
import type {
    StageCameraCenterEvent,
    StageCameraObserver,
    StageCameraScrollEvent,
    StageCameraZoomEvent,
} from "../src/ui/components/stage";

class FakePointerEvent extends Event {
    clientX: number;
    clientY: number;
    pointerId: number;
    button: number;
    altKey: boolean;

    constructor(type: string, init: { clientX?: number; clientY?: number; pointerId?: number; button?: number; altKey?: boolean }) {
        super(type, { bubbles: true, cancelable: true });
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
        this.pointerId = init.pointerId ?? 0;
        this.button = init.button ?? 0;
        this.altKey = init.altKey ?? false;
    }

    preventDefault(): void {}

    stopPropagation(): void {}
}

class FakeWheelEvent extends Event {
    deltaY: number;
    clientX: number;
    clientY: number;

    constructor(type: string, init: { deltaY?: number; clientX?: number; clientY?: number }) {
        super(type, { bubbles: true, cancelable: true });
        this.deltaY = init.deltaY ?? 0;
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
    }

    preventDefault(): void {}
}

type ClassToken = string;

class FakeClassList {
    constructor(private readonly owner: FakeElement) {}

    add(...tokens: ClassToken[]): void {
        for (const token of tokens) {
            this.owner.addClass(token);
        }
    }

    remove(...tokens: ClassToken[]): void {
        for (const token of tokens) {
            this.owner.removeClass(token);
        }
    }

    toggle(token: ClassToken, force?: boolean): boolean {
        return this.owner.toggleClass(token, force);
    }

    contains(token: ClassToken): boolean {
        return this.owner.hasClass(token);
    }
}

class FakeElement extends EventTarget {
    readonly tagName: string;
    dataset: Record<string, string> = {};
    style: Record<string, string> = {};
    textContent = "";
    parentNode: FakeElement | null = null;
    private readonly childrenInternal: FakeElement[] = [];
    private readonly classes = new Set<ClassToken>();
    readonly classList = new FakeClassList(this);

    constructor(tagName = "div") {
        super();
        this.tagName = tagName.toUpperCase();
    }

    appendChild(node: FakeElement): FakeElement {
        return this.insertBefore(node, null);
    }

    insertBefore(node: FakeElement, reference: FakeElement | null): FakeElement {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        const index = reference ? this.childrenInternal.indexOf(reference) : -1;
        const insertIndex = reference && index !== -1 ? index : this.childrenInternal.length;
        this.childrenInternal.splice(insertIndex, 0, node);
        node.parentNode = this;
        return node;
    }

    removeChild(node: FakeElement): FakeElement {
        const index = this.childrenInternal.indexOf(node);
        if (index === -1) {
            throw new Error("Node is not a child of this host");
        }
        this.childrenInternal.splice(index, 1);
        node.parentNode = null;
        return node;
    }

    remove(): void {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    empty(): void {
        while (this.childrenInternal.length) {
            const child = this.childrenInternal.pop()!;
            child.parentNode = null;
        }
    }

    get childNodes(): FakeElement[] {
        return [...this.childrenInternal];
    }

    createDiv(options?: { cls?: string; text?: string }): HTMLElement {
        const div = new FakeElement("div");
        if (options?.cls) {
            for (const token of options.cls.split(/\s+/).filter(Boolean)) {
                div.addClass(token);
            }
        }
        if (options?.text) {
            div.textContent = options.text;
        }
        this.appendChild(div);
        return div as unknown as HTMLElement;
    }

    addClass(token: ClassToken): void {
        if (token) {
            this.classes.add(token);
        }
    }

    removeClass(token: ClassToken): void {
        this.classes.delete(token);
    }

    hasClass(token: ClassToken): boolean {
        return this.classes.has(token);
    }

    toggleClass(token: ClassToken, force?: boolean): boolean {
        if (typeof force === "boolean") {
            if (force) {
                this.classes.add(token);
                return true;
            }
            this.classes.delete(token);
            return false;
        }
        if (this.classes.has(token)) {
            this.classes.delete(token);
            return false;
        }
        this.classes.add(token);
        return true;
    }

    querySelector(selector: string): HTMLElement | null {
        if (selector !== '[data-role="content"]') {
            return null;
        }
        const queue = [...this.childrenInternal];
        while (queue.length) {
            const node = queue.shift()!;
            if (node.dataset.role === "content") {
                return node as unknown as HTMLElement;
            }
            queue.push(...node.childrenInternal);
        }
        return null;
    }

    setPointerCapture(_pointerId: number): void {}

    releasePointerCapture(_pointerId: number): void {}

    getBoundingClientRect(): DOMRect {
        const width = parseFloat(this.style.width ?? "0") || 0;
        const height = parseFloat(this.style.height ?? "0") || 0;
        const left = parseFloat(this.style.left ?? "0") || 0;
        const top = parseFloat(this.style.top ?? "0") || 0;
        return {
            x: left,
            y: top,
            left,
            top,
            right: left + width,
            bottom: top + height,
            width,
            height,
            toJSON() {
                return {};
            },
        } as DOMRect;
    }
}

class FakeWindow extends EventTarget {}

type TelemetryEntry =
    | { type: "center"; event: StageCameraCenterEvent }
    | { type: "zoom"; event: StageCameraZoomEvent }
    | { type: "scroll"; event: StageCameraScrollEvent };

function getViewport(host: FakeElement): FakeElement {
    const [viewport] = host.childNodes;
    if (!viewport) {
        throw new Error("missing viewport node");
    }
    return viewport;
}

async function run() {
    const fakeWindow = new FakeWindow();
    (globalThis as any).window = fakeWindow;
    const rafQueue: FrameRequestCallback[] = [];
    (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
        rafQueue.push(callback);
        return rafQueue.length;
    };

    const host = new FakeElement("div") as unknown as HTMLElement;
    const store = new LayoutEditorStore();
    const telemetryLog: TelemetryEntry[] = [];
    const telemetry: StageCameraObserver = {
        onCenter: event => telemetryLog.push({ type: "center", event }),
        onZoom: event => telemetryLog.push({ type: "zoom", event }),
        onScroll: event => telemetryLog.push({ type: "scroll", event }),
    };

    const controller = new StageController({ host, store, cameraTelemetry: telemetry });

    const viewport = getViewport(host as unknown as FakeElement);
    viewport.style.width = "900";
    viewport.style.height = "700";

    while (rafQueue.length) {
        const callback = rafQueue.shift()!;
        callback(0);
    }

    assert.equal(telemetryLog.length, 1, "initial mount should emit a single center event");
    const initialCenter = telemetryLog[0];
    assert.equal(initialCenter.type, "center");
    assert.equal(initialCenter.event.reason, "initial");
    assert.equal(initialCenter.event.current.offsetX, 0);
    assert.equal(initialCenter.event.current.offsetY, 0);
    assert.equal(initialCenter.event.target.viewportWidth, 900);
    assert.equal(initialCenter.event.target.viewportHeight, 700);
    assert.equal(initialCenter.event.target.offsetX, Math.round((900 - store.getState().canvasWidth) / 2));
    assert.equal(initialCenter.event.target.offsetY, Math.round((700 - store.getState().canvasHeight) / 2));

    telemetryLog.length = 0;

    viewport.dispatchEvent(new FakePointerEvent("pointerdown", { pointerId: 5, button: 1, clientX: 240, clientY: 260 }));
    viewport.dispatchEvent(new FakePointerEvent("pointermove", { pointerId: 5, clientX: 300, clientY: 320 }));

    assert.equal(telemetryLog.length, 1, "panning should emit a single scroll event");
    const panEvent = telemetryLog[0];
    assert.equal(panEvent.type, "scroll");
    assert.equal(panEvent.event.pointerId, 5);
    assert.equal(panEvent.event.delta.x, 60);
    assert.equal(panEvent.event.delta.y, 60);
    assert.equal(panEvent.event.target.offsetX, panEvent.event.current.offsetX + 60);
    assert.equal(panEvent.event.target.offsetY, panEvent.event.current.offsetY + 60);

    viewport.dispatchEvent(new FakePointerEvent("pointerup", { pointerId: 5 }));
    telemetryLog.length = 0;

    store.setCanvasSize(960, 720);
    while (rafQueue.length) {
        const callback = rafQueue.shift()!;
        callback(0);
    }
    assert.equal(telemetryLog.length, 0, "canvas resize should not trigger additional camera centering");

    viewport.dispatchEvent(new FakeWheelEvent("wheel", { deltaY: -120, clientX: 420, clientY: 300 }));
    assert.equal(telemetryLog.length, 1, "zooming should emit a single zoom event");
    const zoomEvent = telemetryLog[0];
    assert.equal(zoomEvent.type, "zoom");
    assert.ok(zoomEvent.event.factor > 1, "zoom factor should reflect zoom-in");
    assert.ok(Math.abs(zoomEvent.event.target.scale - zoomEvent.event.current.scale * zoomEvent.event.factor) < 0.0001);
    const expectedWorldX = (420 - zoomEvent.event.current.offsetX) / zoomEvent.event.current.scale;
    const expectedWorldY = (300 - zoomEvent.event.current.offsetY) / zoomEvent.event.current.scale;
    assert.ok(Math.abs(zoomEvent.event.world.x - expectedWorldX) < 0.0001);
    assert.ok(Math.abs(zoomEvent.event.world.y - expectedWorldY) < 0.0001);
    const expectedOffsetX = 420 - expectedWorldX * zoomEvent.event.target.scale;
    const expectedOffsetY = 300 - expectedWorldY * zoomEvent.event.target.scale;
    assert.ok(Math.abs(zoomEvent.event.target.offsetX - expectedOffsetX) < 0.0001);
    assert.ok(Math.abs(zoomEvent.event.target.offsetY - expectedOffsetY) < 0.0001);

    telemetryLog.length = 0;

    store.createElement("label");
    const createdId = store.getState().selectedElementId!;
    store.moveElement(createdId, { x: 320, y: 180 });
    const focusedElement = store.getState().elements.find(element => element.id === createdId);
    assert.ok(focusedElement, "expected created element to exist");

    controller.focusElement(focusedElement!);
    assert.equal(telemetryLog.length, 1, "focusing should emit a single center event");
    const focusCenter = telemetryLog[0];
    assert.equal(focusCenter.type, "center");
    assert.equal(focusCenter.event.reason, "focus");
    assert.equal(focusCenter.event.elementId, createdId);
    assert.ok(Math.abs(focusCenter.event.target.scale - focusCenter.event.current.scale) < 0.0001);

    const targetWorldCenterX = (focusCenter.event.target.worldLeft + focusCenter.event.target.worldRight) / 2;
    const targetWorldCenterY = (focusCenter.event.target.worldTop + focusCenter.event.target.worldBottom) / 2;
    const elementCenterX = focusedElement!.x + focusedElement!.width / 2;
    const elementCenterY = focusedElement!.y + focusedElement!.height / 2;
    assert.ok(Math.abs(targetWorldCenterX - elementCenterX) <= 0.5, "viewport should center horizontally on focused element");
    assert.ok(Math.abs(targetWorldCenterY - elementCenterY) <= 0.5, "viewport should center vertically on focused element");

    controller.dispose();
    console.log("stage-camera tests passed");
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
