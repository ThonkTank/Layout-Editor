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

    throttledStore.updateElementFrame(elementId!, { x: 10, y: 12 });
    throttledStore.updateElementFrame(elementId!, { x: 20, y: 24 });

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
