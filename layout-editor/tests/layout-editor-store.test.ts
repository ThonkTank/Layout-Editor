import assert from "node:assert/strict";
import { LayoutEditorStore, type LayoutEditorStoreEvent } from "../src/state/layout-editor-store";

async function runTests() {
    const store = new LayoutEditorStore();
    const createdIds = new Set<string>();
    const unsubscribe = store.subscribe((event: LayoutEditorStoreEvent) => {
        if (event.type === "state") {
            for (const element of event.state.elements) {
                createdIds.add(element.id);
            }
        }
    });

    // Create container element
    store.createElement("box-container");
    const stateAfterContainer = store.getState();
    assert.equal(stateAfterContainer.elements.length, 1, "should have one element after creating container");
    const containerId = stateAfterContainer.selectedElementId;
    assert.ok(containerId, "container should be selected");
    const container = stateAfterContainer.elements.find(el => el.id === containerId);
    assert.ok(container, "container must exist");
    assert.equal(container?.type, "box-container");

    // Create child element inside container
    store.createElement("label", { parentId: containerId });
    const stateAfterChild = store.getState();
    assert.equal(stateAfterChild.elements.length, 2, "should have two elements after creating child");
    const child = stateAfterChild.elements.find(el => el.type === "label");
    assert.ok(child, "child element should exist");
    assert.equal(child?.parentId, containerId, "child should be assigned to container");

    // Move child to root and undo/redo
    store.assignElementToContainer(child!.id, null);
    const stateAfterDetach = store.getState();
    const detachedChild = stateAfterDetach.elements.find(el => el.id === child!.id);
    assert.equal(detachedChild?.parentId, undefined, "child should be detached from container");
    store.undo();
    const stateAfterUndo = store.getState();
    const childAfterUndo = stateAfterUndo.elements.find(el => el.id === child!.id);
    assert.equal(childAfterUndo?.parentId, containerId, "undo should restore parent relationship");
    store.redo();
    const stateAfterRedo = store.getState();
    const childAfterRedo = stateAfterRedo.elements.find(el => el.id === child!.id);
    assert.equal(childAfterRedo?.parentId, undefined, "redo should detach child again");

    // Delete element and ensure removal
    store.deleteElement(child!.id);
    const stateAfterDelete = store.getState();
    assert.equal(stateAfterDelete.elements.length, 1, "deleting child should reduce element count");
    assert.ok(!stateAfterDelete.elements.some(el => el.id === child!.id), "child should be removed");

    const externalSnapshot = store.getState();
    const baselineSnapshotJSON = JSON.stringify(externalSnapshot);
    const originalElementCount = externalSnapshot.elements.length;
    const firstElement = externalSnapshot.elements[0];
    assert.ok(firstElement, "container element should still exist after deletion");

    // Regression für "store-snapshot-immutability-tests" (To-Do geschlossen):
    // Wir mutieren den Snapshot absichtlich in der Breite, den verschachtelten
    // Feldern und der Elementliste. Der Store darf davon nichts mitbekommen.
    externalSnapshot.canvasWidth = 1337;
    externalSnapshot.selectedElementId = "ghost";
    firstElement.label = "External mutation";
    firstElement.attributes.push("forged-attribute");
    firstElement.children = ["phantom-child"];
    firstElement.layout = { gap: 99, padding: 7, align: "end" };
    firstElement.options = ["ghost-option"];
    firstElement.viewState = { hacked: true };
    externalSnapshot.elements.push({
        ...firstElement,
        id: "forged",
        label: "Forged",
    });
    externalSnapshot.elements.pop();

    const stateAfterExternalMutation = store.getState();
    assert.equal(
        stateAfterExternalMutation.elements.length,
        originalElementCount,
        "mutating snapshot arrays must not change store element count",
    );
    assert.notEqual(
        stateAfterExternalMutation.elements[0]?.label,
        "External mutation",
        "mutating snapshot properties must not leak into the store",
    );
    assert.deepEqual(
        JSON.parse(JSON.stringify(stateAfterExternalMutation)),
        JSON.parse(baselineSnapshotJSON),
        "store state must remain identical after external snapshot mutations",
    );

    store.undo();
    const undoStateAfterExternalMutation = store.getState();
    assert.ok(
        undoStateAfterExternalMutation.elements.some(el => el.id === child!.id),
        "undo should restore deleted child even after snapshot mutation",
    );
    store.redo();
    const redoStateAfterExternalMutation = store.getState();
    assert.ok(
        !redoStateAfterExternalMutation.elements.some(el => el.id === child!.id),
        "redo should reapply deletion after snapshot mutation",
    );

    unsubscribe();
    assert.ok(createdIds.size >= 2, "should have observed element ids through subscription");

    // Export throttling during drag updates
    const throttledStore = new LayoutEditorStore();
    const receivedEvents: LayoutEditorStoreEvent[] = [];
    const unsubscribeThrottled = throttledStore.subscribe(event => {
        receivedEvents.push(event);
    });

    receivedEvents.length = 0; // drop initial snapshot events

    throttledStore.createElement("label");
    const elementId = throttledStore.getState().selectedElementId;
    assert.ok(elementId, "newly created element should be selected");

    receivedEvents.length = 0; // focus on drag interactions only

    throttledStore.moveElement(elementId!, { x: 10, y: 12 }, { skipExport: true });
    throttledStore.moveElement(elementId!, { x: 20, y: 24 }, { skipExport: true });

    const stateEventsDuringDrag = receivedEvents.filter(event => event.type === "state");
    const exportEventsDuringDrag = receivedEvents.filter(event => event.type === "export");
    assert.ok(stateEventsDuringDrag.length >= 2, "state events should be emitted for drag updates");
    assert.equal(exportEventsDuringDrag.length, 0, "export events should be throttled during drag");

    throttledStore.flushExport();

    const exportEventsAfterFlush = receivedEvents.filter(event => event.type === "export");
    assert.equal(exportEventsAfterFlush.length, 1, "flush should publish a single export payload");

    throttledStore.flushExport();
    const exportEventsAfterSecondFlush = receivedEvents.filter(event => event.type === "export");
    assert.equal(
        exportEventsAfterSecondFlush.length,
        exportEventsAfterFlush.length,
        "subsequent flush without changes should not emit",
    );

    unsubscribeThrottled();
}

async function run() {
    try {
        await runTests();
        console.log("layout-editor-store tests passed");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
