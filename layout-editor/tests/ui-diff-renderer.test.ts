import assert from "node:assert/strict";
import { UIComponent } from "../src/ui/components/component";
import { DiffRenderer } from "../src/ui/components/diff-renderer";

class FakeNode extends EventTarget {
    readonly tagName: string;
    private childrenInternal: FakeNode[] = [];
    parentNode: FakeNode | null = null;
    dataset: Record<string, string> = {};
    style: Record<string, string> = {};
    textContent = "";
    private listenerCounts = new Map<string, number>();

    constructor(tagName: string) {
        super();
        this.tagName = tagName.toUpperCase();
    }

    appendChild(node: FakeNode): FakeNode {
        return this.insertBefore(node, null);
    }

    insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        const index = reference ? this.childrenInternal.indexOf(reference) : -1;
        if (reference && index === -1) {
            throw new Error("Reference node is not a child of this host");
        }
        const insertIndex = reference ? index : this.childrenInternal.length;
        this.childrenInternal.splice(insertIndex, 0, node);
        node.parentNode = this;
        return node;
    }

    removeChild(node: FakeNode): FakeNode {
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

    get firstChild(): FakeNode | null {
        return this.childrenInternal[0] ?? null;
    }

    get nextSibling(): FakeNode | null {
        if (!this.parentNode) return null;
        const siblings = this.parentNode.childrenInternal;
        const index = siblings.indexOf(this);
        if (index === -1 || index + 1 >= siblings.length) return null;
        return siblings[index + 1];
    }

    get childNodes(): FakeNode[] {
        return this.childrenInternal.slice();
    }

    contains(node: FakeNode | null): boolean {
        if (!node) return false;
        let cursor: FakeNode | null = node;
        while (cursor) {
            if (cursor === this) return true;
            cursor = cursor.parentNode;
        }
        return false;
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, listener as EventListener, options);
        this.listenerCounts.set(type, (this.listenerCounts.get(type) ?? 0) + 1);
    }

    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(type, listener as EventListener, options);
        const next = (this.listenerCounts.get(type) ?? 1) - 1;
        this.listenerCounts.set(type, Math.max(0, next));
    }

    listenerCount(type: string): number {
        return this.listenerCounts.get(type) ?? 0;
    }
}

class HarnessComponent extends UIComponent<HTMLElement> {
    protected onMount(): void {}

    public makeScope() {
        return this.createScope();
    }
}

async function run() {
    const hostNode = new FakeNode("ul");
    const host = hostNode as unknown as HTMLElement;
    const component = new HarnessComponent();
    component.mount(host);

    const callCounts: Record<string, number> = {};
    const destroyed: string[] = [];

    const renderer = new DiffRenderer<{ id: string; label: string }, HTMLElement>(
        host,
        () => component.makeScope(),
        {
            getKey: item => item.id,
            create: (item, context) => {
                const node = new FakeNode("li");
                node.dataset.id = item.id;
                node.textContent = item.label;
                context.scope.listen(node, "ping", () => {
                    callCounts[item.id] = (callCounts[item.id] ?? 0) + 1;
                });
                return node as unknown as HTMLElement;
            },
            update: (node, item) => {
                const fake = node as unknown as FakeNode;
                fake.textContent = item.label;
            },
            destroy: (_node, context) => {
                destroyed.push(context.value.id);
            },
        },
    );

    renderer.patch([
        { id: "a", label: "A" },
        { id: "b", label: "B" },
    ]);

    const [nodeA, nodeB] = hostNode.childNodes;
    assert.equal(hostNode.childNodes.length, 2, "initial render should create two nodes");

    nodeA.dispatchEvent(new Event("ping"));
    assert.equal(callCounts["a"], 1, "listener should fire while node is mounted");

    renderer.patch([
        { id: "b", label: "B updated" },
        { id: "c", label: "C" },
    ]);

    const [nextB, nextC] = hostNode.childNodes;
    assert.equal(hostNode.childNodes.length, 2, "second render should still have two nodes");
    assert.equal(nextB, nodeB, "existing node should be preserved when key is reused");
    assert.equal(nextB.textContent, "B updated", "update callback should run for reused nodes");
    assert.equal(nextC.dataset.id, "c", "new node should be appended for new key");

    nodeA.dispatchEvent(new Event("ping"));
    assert.equal(callCounts["a"], 1, "removed node should release its listener scope");
    assert.equal(nodeA.listenerCount("ping"), 0, "listener should be removed when node is destroyed");
    assert.deepEqual(destroyed, ["a"], "destroy hook should receive removed keys");

    renderer.patch([
        { id: "c", label: "C" },
        { id: "d", label: "D" },
    ]);

    const finalChildren = hostNode.childNodes;
    assert.equal(finalChildren.length, 2, "renderer should reuse container for subsequent patches");
    assert.equal(finalChildren[0].dataset.id, "c");
    assert.equal(finalChildren[1].dataset.id, "d");

    component.destroy();
    console.log("ui-diff-renderer tests passed");
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
