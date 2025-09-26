import assert from "node:assert/strict";
import { LayoutTree } from "../src/model/layout-tree";
import { collectDescendantIds } from "../src/utils/tree-helpers";
import type { LayoutElement } from "../src/types";
import { LayoutEditorStore } from "../src/state/layout-editor-store";

function createContainer(id: string, label: string): LayoutElement {
    return {
        id,
        type: "box-container",
        x: 0,
        y: 0,
        width: 320,
        height: 240,
        label,
        attributes: [],
        layout: { gap: 8, padding: 8, align: "stretch" },
        children: [],
    };
}

function createLeaf(id: string, label: string, parentId?: string): LayoutElement {
    return {
        id,
        type: "label",
        x: 0,
        y: 0,
        width: 120,
        height: 60,
        label,
        attributes: [],
        parentId,
    };
}

async function runTests() {
    const root = createContainer("root", "Root");
    const childA = createLeaf("child-a", "A", "root");
    const childB = createLeaf("child-b", "B", "root");
    root.children = [childA.id, childB.id];

    const tree = new LayoutTree([root, childA, childB]);
    assert.deepEqual(tree.getElement("root")?.children, [childA.id, childB.id], "tree should hydrate initial children order");

    tree.moveChild("root", childB.id, -1);
    assert.deepEqual(tree.getElement("root")?.children, [childB.id, childA.id], "reordering should update child order");

    tree.setParent(childB.id, null);
    assert.equal(tree.getElement(childB.id)?.parentId, undefined, "detached child should have no parent");
    assert.deepEqual(tree.getElement("root")?.children, [childA.id], "root should drop detached child");
    assert.deepEqual(Array.from(collectDescendantIds(tree, "root")), [childA.id], "descendant helper should reflect current tree");

    const snapshotElements = tree.getElementsSnapshot();
    const rootSnapshot = snapshotElements.find(el => el.id === "root");
    assert.ok(rootSnapshot, "snapshot must contain root element");
    assert.deepEqual(rootSnapshot?.children, [childA.id], "snapshot children must match tree state");

    const store = new LayoutEditorStore();
    store.createElement("box-container");
    const containerA = store.getState().selectedElementId!;
    store.createElement("box-container");
    const containerB = store.getState().selectedElementId!;
    store.assignElementToContainer(containerB, null);

    store.createElement("label", { parentId: containerA });
    const firstChild = store.getState().selectedElementId!;
    store.createElement("textarea", { parentId: containerA });
    const secondChild = store.getState().selectedElementId!;

    store.moveChildInContainer(containerA, secondChild, -1);
    let state = store.getState();
    let containerState = state.elements.find(el => el.id === containerA);
    const containerOrder = (containerState?.children ?? []).filter(id => id === firstChild || id === secondChild);
    assert.deepEqual(containerOrder, [secondChild, firstChild], "container order should reflect move operation");
    let serialized = JSON.parse(store.serializeState());
    let serializedContainer = serialized.elements.find((el: any) => el.id === containerA);
    const serializedOrder = (serializedContainer.children as string[]).filter((id: string) => id === firstChild || id === secondChild);
    assert.deepEqual(serializedOrder, [secondChild, firstChild], "serialized snapshot should preserve order");

    store.assignElementToContainer(firstChild, containerB);
    state = store.getState();
    containerState = state.elements.find(el => el.id === containerA);
    assert.deepEqual(containerState?.children, [secondChild], "original container should only keep remaining child");
    const containerBState = state.elements.find(el => el.id === containerB);
    assert.deepEqual(containerBState?.children, [firstChild], "target container should include reassigned child");
    serialized = JSON.parse(store.serializeState());
    serializedContainer = serialized.elements.find((el: any) => el.id === containerB);
    assert.deepEqual(serializedContainer.children, [firstChild], "serialized snapshot should mirror reparented tree");

    store.undo();
    state = store.getState();
    containerState = state.elements.find(el => el.id === containerA);
    const undoOrder = (containerState?.children ?? []).filter(id => id === firstChild || id === secondChild);
    assert.deepEqual(undoOrder, [secondChild, firstChild], "undo should restore previous container order");

    store.redo();
    state = store.getState();
    containerState = state.elements.find(el => el.id === containerA);
    assert.deepEqual(containerState?.children, [secondChild], "redo should detach moved child again");
}

async function run() {
    try {
        await runTests();
        console.log("layout-tree tests passed");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
