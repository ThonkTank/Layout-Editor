import assert from "node:assert/strict";
import { LayoutEditorStore } from "../src/state/layout-editor-store";
import { StageComponent } from "../src/ui/components/stage";
import type { StageComponentOptions } from "../src/ui/components/stage";

type ClassToken = string;

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

class InstrumentedStore extends LayoutEditorStore {
    public getStateCalls = 0;

    override getState() {
        this.getStateCalls += 1;
        return super.getState();
    }
}

function findNode(host: FakeElement, id: string): FakeElement {
    const canvas = getCanvas(host);
    const match = canvas.childNodes.find(node => node.dataset.id === id);
    if (!match) {
        throw new Error(`Unable to locate canvas node for ${id}`);
    }
    return match;
}

function getCanvas(host: FakeElement): FakeElement {
    const [viewport] = host.childNodes;
    const [camera] = viewport.childNodes;
    const [zoom] = camera.childNodes;
    const [canvas] = zoom.childNodes;
    return canvas;
}

function px(value: string | undefined): number {
    if (!value) return 0;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

async function run() {
    const fakeWindow = new FakeWindow();
    (globalThis as any).window = fakeWindow;
    (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
    };

    const host = new FakeElement("div") as unknown as HTMLElement;
    const store = new InstrumentedStore();
    const noopPreview = (() => {}) as NonNullable<StageComponentOptions["renderPreview"]>;
    const stage = new StageComponent({ store, renderPreview: noopPreview });
    stage.mount(host);

    const initial = store.getState();
    stage.syncStage(initial.elements, initial.selectedElementId, initial.canvasWidth, initial.canvasHeight);

    let collecting = false;
    let stateEvents = 0;
    let exportEvents = 0;

    const unsubscribe = store.subscribe(event => {
        if (event.type === "state") {
            stage.syncStage(event.state.elements, event.state.selectedElementId, event.state.canvasWidth, event.state.canvasHeight);
            if (collecting) {
                stateEvents += 1;
            }
        } else if (collecting && event.type === "export") {
            exportEvents += 1;
        }
    });

    store.createElement("box-container");
    const containerId = store.getState().selectedElementId!;
    store.createElement("label", { parentId: containerId });
    const childA = store.getState().selectedElementId!;
    store.createElement("label", { parentId: containerId });
    const childB = store.getState().selectedElementId!;

    const prepared = store.getState();
    stage.syncStage(prepared.elements, prepared.selectedElementId, prepared.canvasWidth, prepared.canvasHeight);

    collecting = true;
    stateEvents = 0;
    exportEvents = 0;

    const baseGetStateCalls = store.getStateCalls;

    const containerNode = findNode(host as unknown as FakeElement, containerId);
    const childNodeA = findNode(host as unknown as FakeElement, childA);
    const childNodeB = findNode(host as unknown as FakeElement, childB);

    const startX = 5;
    const startY = 20;
    const move1X = 25;
    const move1Y = 50;
    const move2X = 35;
    const move2Y = 65;

    const initialContainerLeft = px((containerNode as any).style.left);
    const initialContainerTop = px((containerNode as any).style.top);
    const initialChildLefts = [childNodeA, childNodeB].map(node => px((node as any).style.left));
    const initialChildTops = [childNodeA, childNodeB].map(node => px((node as any).style.top));

    (containerNode as unknown as HTMLElement).dispatchEvent(
        new FakePointerEvent("pointerdown", { pointerId: 1, button: 0, clientX: startX, clientY: startY }),
    );

    fakeWindow.dispatchEvent(new FakePointerEvent("pointermove", { pointerId: 1, clientX: move1X, clientY: move1Y }));

    assert.equal(stateEvents, 1, "first drag frame should emit a single state event");
    assert.equal(exportEvents, 0, "first drag frame should not export while skipping");
    assert.equal(store.getStateCalls - baseGetStateCalls, 0, "drag frame should not trigger extra store snapshots");

    const afterMove1Left = px((containerNode as any).style.left);
    const afterMove1Top = px((containerNode as any).style.top);
    assert.equal(afterMove1Left - initialContainerLeft, move1X - startX, "container X should follow pointer delta");
    assert.equal(afterMove1Top - initialContainerTop, move1Y - startY, "container Y should follow pointer delta");
    const childLeftDiffs = [childNodeA, childNodeB].map((node, index) => px((node as any).style.left) - initialChildLefts[index]);
    const childTopDiffs = [childNodeA, childNodeB].map((node, index) => px((node as any).style.top) - initialChildTops[index]);
    for (const diff of childLeftDiffs) {
        assert.equal(diff, move1X - startX, "child X should remain aligned with container drag");
    }
    for (const diff of childTopDiffs) {
        assert.equal(diff, move1Y - startY, "child Y should remain aligned with container drag");
    }

    stateEvents = 0;
    exportEvents = 0;
    const nextGetStateBaseline = store.getStateCalls;

    fakeWindow.dispatchEvent(new FakePointerEvent("pointermove", { pointerId: 1, clientX: move2X, clientY: move2Y }));

    assert.equal(stateEvents, 1, "second drag frame should emit a single state event");
    assert.equal(exportEvents, 0, "second drag frame should still skip export");
    assert.equal(store.getStateCalls - nextGetStateBaseline, 0, "second drag frame should avoid store.getState calls");

    const afterMove2Left = px((containerNode as any).style.left);
    const afterMove2Top = px((containerNode as any).style.top);
    assert.equal(afterMove2Left - initialContainerLeft, move2X - startX, "container X should track subsequent pointer delta");
    assert.equal(afterMove2Top - initialContainerTop, move2Y - startY, "container Y should track subsequent pointer delta");

    fakeWindow.dispatchEvent(new FakePointerEvent("pointerup", { pointerId: 1 }));

    assert.ok(exportEvents >= 1, "finishing drag should flush export payload once");
    assert.equal((containerNode as any).hasClass("is-interacting"), false, "interaction flag should reset");

    unsubscribe();
    stage.destroy();
    console.log("stage-component tests passed");
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
