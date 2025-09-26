import assert from "node:assert/strict";
import { LayoutEditorStore } from "../src/state/layout-editor-store";
import {
    resetStageInteractionTelemetry,
    setStageInteractionLogger,
    type StageInteractionEvent,
    type StageInteractionLogger,
} from "../src/state/interaction-telemetry";
import type { LayoutElement } from "../src/types";

class RecordingLogger implements StageInteractionLogger {
    readonly events: StageInteractionEvent[] = [];

    log(event: StageInteractionEvent) {
        this.events.push(event);
    }
}

function frameOf(element: LayoutElement) {
    return { x: element.x, y: element.y, width: element.width, height: element.height };
}

async function runDragTelemetryScenario() {
    resetStageInteractionTelemetry();
    const store = new LayoutEditorStore();
    store.createElement("label");
    const elementId = store.getState().selectedElementId;
    assert.ok(elementId, "drag scenario requires a selected element");

    const logger = new RecordingLogger();
    setStageInteractionLogger(logger);
    try {
        store.runInteraction(() => {
            store.moveElement(elementId!, { x: 24, y: 32 }, { skipExport: true });
            store.moveElement(elementId!, { x: 48, y: 56 });
        });
    } finally {
        resetStageInteractionTelemetry();
    }

    assert.deepEqual(logger.events, [
        { type: "interaction:start", depth: 1 },
        {
            type: "interaction:end",
            depth: 1,
            hasPendingState: true,
            willDispatchState: true,
            skipExport: false,
        },
    ]);
}

async function runStageResizeScenario() {
    resetStageInteractionTelemetry();
    const store = new LayoutEditorStore();
    store.createElement("label");
    const createdState = store.getState();
    const element = createdState.elements.find(el => el.id === createdState.selectedElementId);
    assert.ok(element, "resize scenario requires an element snapshot");
    const elementId = element.id;

    store.moveElement(elementId, { x: 560, y: 420 });
    const beforeResizeState = store.getState();
    const beforeResizeElement = beforeResizeState.elements.find(el => el.id === elementId);
    assert.ok(beforeResizeElement, "element snapshot before resize must exist");
    const expectedPreviousFrame = frameOf(beforeResizeElement);

    const logger = new RecordingLogger();
    setStageInteractionLogger(logger);
    try {
        store.setCanvasSize(360, 280);
    } finally {
        resetStageInteractionTelemetry();
    }

    const afterResizeState = store.getState();
    const afterResizeElement = afterResizeState.elements.find(el => el.id === elementId);
    assert.ok(afterResizeElement, "element snapshot after resize must exist");

    assert.deepEqual(logger.events, [
        {
            type: "canvas:size",
            previous: { width: 800, height: 600 },
            requested: { width: 360, height: 280 },
            result: { width: 360, height: 280 },
            changed: true,
        },
        {
            type: "clamp:step",
            elementId,
            previous: expectedPreviousFrame,
            result: frameOf(afterResizeElement),
            canvas: { width: 360, height: 280 },
        },
    ]);
}

async function runTests() {
    await runDragTelemetryScenario();
    await runStageResizeScenario();
}

async function run() {
    try {
        await runTests();
        console.log("layout-editor-store instrumentation tests passed");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
