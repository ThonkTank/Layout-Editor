import assert from "node:assert/strict";
import {
    buildContainerVariantMatrix,
    clampPositionWithinStage,
    clampSizeWithinStage,
    createContainerFixture,
    finalizeDrag,
    finalizeResize,
    getElementSnapshot,
    simulateDragFrame,
    simulateResizeFrame,
} from "./helpers/container-fixtures";

interface ScenarioSummary {
    stage: string;
    type: string;
    align: string;
    dragAttempt: { x: number; y: number };
    dragFinal: { x: number; y: number };
    resizeAttempt: { width: number; height: number };
    resizeFinal: { width: number; height: number };
}

async function runMatrix(): Promise<void> {
    const scenarios = buildContainerVariantMatrix();
    const summaries: ScenarioSummary[] = [];

    for (const scenario of scenarios) {
        const fixture = createContainerFixture(scenario);
        let baseline = fixture.baseline.child;
        const key = `${scenario.containerType} / ${scenario.align} @ ${scenario.stage.width}x${scenario.stage.height}`;

        let dragTarget = clampPositionWithinStage(baseline, scenario.stage, 48, 36);
        if (dragTarget.x === baseline.x && dragTarget.y === baseline.y) {
            dragTarget = clampPositionWithinStage(baseline, scenario.stage, -36, -24);
        }
        assert.notDeepStrictEqual(
            dragTarget,
            { x: baseline.x, y: baseline.y },
            `Drag target must differ from baseline for ${key}.`,
        );

        const dragResult = simulateDragFrame(fixture.store, fixture.childId, dragTarget, fixture.containerId);
        assert.notDeepStrictEqual(
            { x: dragResult.beforeRelayout.x, y: dragResult.beforeRelayout.y },
            { x: baseline.x, y: baseline.y },
            `Pre-relayout drag snapshot should reflect the attempted offset for ${key}.`,
        );
        assert.deepEqual(
            { x: dragResult.afterRelayout.x, y: dragResult.afterRelayout.y },
            { x: baseline.x, y: baseline.y },
            `Silent relayout must restore baseline offsets during drag for ${key}.`,
        );

        finalizeDrag(fixture.store, fixture.containerId);
        const postDragSnapshot = getElementSnapshot(fixture.store, fixture.childId);
        assert.deepEqual(
            { x: postDragSnapshot.x, y: postDragSnapshot.y },
            { x: baseline.x, y: baseline.y },
            `Final drag relayout should keep baseline offsets for ${key}.`,
        );

        baseline = postDragSnapshot;

        let sizeTarget = clampSizeWithinStage(baseline, scenario.stage, 72, 54);
        if (sizeTarget.width === baseline.width && sizeTarget.height === baseline.height) {
            sizeTarget = clampSizeWithinStage(baseline, scenario.stage, -36, -24);
        }
        assert.notDeepStrictEqual(
            sizeTarget,
            { width: baseline.width, height: baseline.height },
            `Resize target must differ from baseline for ${key}.`,
        );

        const resizeResult = simulateResizeFrame(
            fixture.store,
            fixture.childId,
            { size: sizeTarget },
            fixture.containerId,
        );
        assert.notDeepStrictEqual(
            { width: resizeResult.beforeRelayout.width, height: resizeResult.beforeRelayout.height },
            { width: baseline.width, height: baseline.height },
            `Pre-relayout resize snapshot should reflect attempted size for ${key}.`,
        );
        assert.deepEqual(
            { width: resizeResult.afterRelayout.width, height: resizeResult.afterRelayout.height },
            { width: baseline.width, height: baseline.height },
            `Silent relayout must restore baseline dimensions during resize for ${key}.`,
        );

        finalizeResize(fixture.store, fixture.containerId);
        const postResizeSnapshot = getElementSnapshot(fixture.store, fixture.childId);
        assert.deepEqual(
            { width: postResizeSnapshot.width, height: postResizeSnapshot.height },
            { width: baseline.width, height: baseline.height },
            `Final resize relayout should keep baseline dimensions for ${key}.`,
        );

        summaries.push({
            stage: `${scenario.stage.width}x${scenario.stage.height}`,
            type: scenario.containerType,
            align: scenario.align,
            dragAttempt: { x: dragResult.beforeRelayout.x, y: dragResult.beforeRelayout.y },
            dragFinal: { x: dragResult.afterRelayout.x, y: dragResult.afterRelayout.y },
            resizeAttempt: {
                width: resizeResult.beforeRelayout.width,
                height: resizeResult.beforeRelayout.height,
            },
            resizeFinal: {
                width: resizeResult.afterRelayout.width,
                height: resizeResult.afterRelayout.height,
            },
        });
    }

    console.table(
        summaries.map(entry => ({
            stage: entry.stage,
            type: entry.type,
            align: entry.align,
            drag: `${entry.dragAttempt.x}/${entry.dragAttempt.y}→${entry.dragFinal.x}/${entry.dragFinal.y}`,
            resize: `${entry.resizeAttempt.width}×${entry.resizeAttempt.height}→${entry.resizeFinal.width}×${entry.resizeFinal.height}`,
        })),
    );
    console.log("container relayout matrix passed");
}

runMatrix().catch(error => {
    console.error(error);
    process.exit(1);
});
