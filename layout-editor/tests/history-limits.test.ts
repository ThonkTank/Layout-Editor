import assert from "node:assert/strict";
import { LayoutHistory } from "../src/history";
import type { LayoutEditorSnapshot, LayoutElement } from "../src/types";

const ELEMENT_TEMPLATE: Omit<LayoutElement, "id" | "label"> = {
    type: "label",
    x: 0,
    y: 0,
    width: 120,
    height: 40,
    description: undefined,
    placeholder: undefined,
    defaultValue: undefined,
    options: undefined,
    attributes: [],
    parentId: undefined,
    layout: undefined,
    children: undefined,
    viewBindingId: undefined,
    viewState: undefined,
};

function cloneSnapshot(snapshot: LayoutEditorSnapshot): LayoutEditorSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as LayoutEditorSnapshot;
}

function createLabelSnapshot(step: number): LayoutEditorSnapshot {
    return {
        canvasWidth: 1000,
        canvasHeight: 800,
        selectedElementId: "el",
        elements: [
            {
                ...ELEMENT_TEMPLATE,
                id: "el",
                label: `Label ${step}`,
                attributes: [],
            },
        ],
    };
}

async function testHistoryCapAndRedoIntegrity() {
    let current = createLabelSnapshot(0);
    const history = new LayoutHistory(
        () => cloneSnapshot(current),
        snapshot => {
            current = cloneSnapshot(snapshot);
        },
    );

    history.reset(current);

    for (let step = 1; step <= 55; step++) {
        const next = createLabelSnapshot(step);
        current = cloneSnapshot(next);
        history.push(next);
    }

    for (let i = 0; i < 60; i++) {
        history.undo();
    }

    assert.equal(current.elements[0]?.label, "Label 5", "undo should stop at bounded baseline");
    assert.equal(history.canUndo, false, "history should not allow undo past retained window");

    current.elements[0]!.label = "Mutated outside history";
    current.elements.push({
        ...ELEMENT_TEMPLATE,
        id: "temp",
        label: "Temp",
        attributes: [],
    });

    for (let i = 0; i < 60; i++) {
        history.redo();
    }

    assert.equal(current.elements[0]?.label, "Label 55", "redo should reach latest snapshot after pruning");
    assert.equal(current.elements.length, 1, "redo should ignore external snapshot mutations");
    assert.equal(history.canRedo, false, "redo should be exhausted after reaching latest state");
}

function createComplexSnapshots(): LayoutEditorSnapshot[] {
    const base: LayoutEditorSnapshot = {
        canvasWidth: 800,
        canvasHeight: 600,
        selectedElementId: null,
        elements: [],
    };

    const root: LayoutElement = {
        ...ELEMENT_TEMPLATE,
        id: "root",
        type: "box-container",
        width: 400,
        height: 240,
        label: "Root",
        attributes: [],
        children: [],
    };

    const child: LayoutElement = {
        ...ELEMENT_TEMPLATE,
        id: "child",
        parentId: "root",
        label: "Child",
        x: 16,
        y: 24,
        width: 240,
        height: 64,
        attributes: [],
    };

    const snapshots: LayoutEditorSnapshot[] = [
        base,
        {
            ...base,
            selectedElementId: "root",
            elements: [
                {
                    ...root,
                    children: [],
                },
            ],
        },
        {
            canvasWidth: 800,
            canvasHeight: 600,
            selectedElementId: "child",
            elements: [
                {
                    ...root,
                    children: ["child"],
                },
                {
                    ...child,
                },
            ],
        },
        {
            canvasWidth: 800,
            canvasHeight: 600,
            selectedElementId: "root",
            elements: [
                {
                    ...root,
                    label: "Root Updated",
                    children: ["child"],
                },
                {
                    ...child,
                },
            ],
        },
        {
            canvasWidth: 800,
            canvasHeight: 600,
            selectedElementId: "child",
            elements: [
                {
                    ...child,
                },
                {
                    ...root,
                    label: "Root Updated",
                    children: ["child"],
                },
            ],
        },
        {
            canvasWidth: 800,
            canvasHeight: 600,
            selectedElementId: "root",
            elements: [
                {
                    ...root,
                    label: "Root Updated",
                    children: [],
                },
            ],
        },
        {
            canvasWidth: 1024,
            canvasHeight: 768,
            selectedElementId: null,
            elements: [
                {
                    ...root,
                    label: "Root Updated",
                    width: 420,
                    height: 260,
                    children: [],
                },
            ],
        },
    ];

    return snapshots.map(cloneSnapshot);
}

async function testPatchReplayAccuracy() {
    const snapshots = createComplexSnapshots();
    let current = cloneSnapshot(snapshots[0]);

    const history = new LayoutHistory(
        () => cloneSnapshot(current),
        snapshot => {
            current = cloneSnapshot(snapshot);
        },
    );

    history.reset(current);

    for (let i = 1; i < snapshots.length; i++) {
        const next = snapshots[i];
        current = cloneSnapshot(next);
        history.push(next);
        assert.deepEqual(current, snapshots[i], `push should leave current at snapshot ${i}`);
    }

    for (let i = snapshots.length - 1; i > 0; i--) {
        history.undo();
        assert.deepEqual(current, snapshots[i - 1], `undo should reach snapshot ${i - 1}`);
    }

    const baseline = cloneSnapshot(current);
    history.undo();
    assert.deepEqual(current, baseline, "extra undo should have no effect at baseline");

    for (let i = 1; i < snapshots.length; i++) {
        history.redo();
        assert.deepEqual(current, snapshots[i], `redo should reach snapshot ${i}`);
    }
}

async function run() {
    try {
        await testHistoryCapAndRedoIntegrity();
        await testPatchReplayAccuracy();
        console.log("history limits tests passed");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
