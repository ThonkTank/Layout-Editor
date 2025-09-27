# Stage Instrumentation Guide

The stage of the Layout Editor exposes explicit telemetry hooks so analytics, QA tools,
and integration tests can observe canvas interactions without polling the store. This
guide documents the event contract, observer/logger lifecycle, and the conventions that
keep stage instrumentation deterministic and safe to consume.

## Scope & File Map

```
layout-editor/docs/stage-instrumentation.md   ← this guide
layout-editor/src/state/interaction-telemetry.ts
layout-editor/src/state/layout-editor-store.ts
layout-editor/src/presenters/stage-controller.ts
layout-editor/src/ui/components/stage.ts
layout-editor/tests/layout-editor-store.instrumentation.test.ts
layout-editor/tests/stage-camera.test.ts
```

* `interaction-telemetry.ts` owns the telemetry types and registration helpers.
* `layout-editor-store.ts` raises interaction events (drag batching, canvas sizing,
  clamping) through the telemetry hub.
* `stage-controller.ts` proxies camera observers from the UI layer into the stage
  component and guarantees cleanup.
* The tests assert the end-to-end event sequences for store interactions and camera
  movements.

## Stage Interaction Telemetry Contract

`stageInteractionTelemetry` exposes four interaction events. Every payload is fully
JSON-serialisable and must remain stable across releases.

| Event type           | Raised by                         | Required fields |
| -------------------- | --------------------------------- | ---------------- |
| `interaction:start`  | `LayoutEditorStore.runInteraction` entry | `depth` (nesting level) |
| `interaction:end`    | `LayoutEditorStore.runInteraction` exit  | `depth`, `hasPendingState`, `willDispatchState`, `skipExport` |
| `canvas:size`        | `LayoutEditorStore.setCanvasSize`        | `previous`, `requested`, `result`, `changed` |
| `clamp:step`         | Per element during `setCanvasSize` clamp | `elementId`, `previous`, `result`, `canvas` |

### Field Semantics & Requirements

* **`depth`** – Number of currently nested `runInteraction` calls. Must be a
  non-negative integer. The pair of `interaction:start`/`interaction:end` events for a
  given depth bracket the same interaction batch.
* **`hasPendingState`** – Indicates whether an interaction produced mutations that still
  need to be flushed. This flag is required so analytics can distinguish empty drags from
  meaningful ones.
* **`willDispatchState`** – Signals that the store will emit a state snapshot after the
  interaction ends. Required for tests that expect deterministic snapshot emission.
* **`skipExport`** – Propagates the export suppression flag from the caller. Required so
  downstream loggers can omit redundant export payloads.
* **`previous` / `requested` / `result`** – Canvas size snapshots (`{ width, height }`).
  The store must always emit absolute pixel values. `result` must equal `requested`
  whenever `changed` is `false`.
* **`changed`** – Boolean flag signalling whether `setCanvasSize` modified the canvas.
  Required to keep observers from reprocessing redundant updates.
* **`elementId`** – Target layout element whose frame was clamped after a canvas resize.
  The value must be stable across the clamp series so loggers can stitch sequences.
* **`previous` / `result` (clamp)** – Element frame snapshots with `x`, `y`, `width`, and
  `height`. Callers must supply already-cloned values to avoid leaking mutable store
  references.
* **`canvas`** – Canvas dimensions that were used to evaluate the clamp. Use the same
  values that were emitted in the associated `canvas:size` event.

### Adding New Events

1. Extend the `StageInteractionEvent` union and the observer interface with the new
   payload type.
2. Update the tests in
   `layout-editor/tests/layout-editor-store.instrumentation.test.ts` to include the new
   event in recorded sequences.
3. Document the payload fields and their required invariants in this guide.
4. Maintain JSON-serialisable payloads so loggers can persist events verbatim.

## Reset & Lifecycle Conventions

* `resetStageInteractionTelemetry()` **must** be called in every test `afterEach`
  (or equivalent) to clear previously registered observers and loggers.
* Observers and loggers are process-wide singletons. The setter functions replace the
  existing hooks atomically; passing `null` detaches the previous hook.
* The telemetry hub never buffers events. Consumers must register before triggering
  interactions and deregister when they no longer require updates.

## Observer & Logger Usage

### Attaching an Observer

Observers receive structured callbacks that are convenient for in-process diagnostics.
They are optional and can subscribe to a subset of events by omitting methods.

```ts
import {
    setStageInteractionObserver,
    resetStageInteractionTelemetry,
    type StageInteractionObserver,
} from "layout-editor/src/state/interaction-telemetry";

const observer: StageInteractionObserver = {
    interactionStarted: event => {
        console.debug("interaction depth", event.depth);
    },
    canvasSizeEvaluated: event => {
        if (event.changed) {
            console.debug("canvas resized", event.result);
        }
    },
};

setStageInteractionObserver(observer);

// …run interaction scenario…

resetStageInteractionTelemetry();
```

### Attaching a Logger

Loggers receive the raw `StageInteractionEvent` union, making them suitable for test
recordings or shipping events to analytics backends.

```ts
import {
    setStageInteractionLogger,
    resetStageInteractionTelemetry,
    type StageInteractionLogger,
} from "layout-editor/src/state/interaction-telemetry";

const events: StageInteractionEvent[] = [];
const logger: StageInteractionLogger = {
    log: event => {
        events.push(event);
    },
};

setStageInteractionLogger(logger);

try {
    // …execute store interactions…
} finally {
    resetStageInteractionTelemetry();
}
```

### Combining Observer & Logger

Both hooks can be active simultaneously. The observer runs first; the logger receives the
identical payload afterwards. Use this to keep lightweight runtime diagnostics alongside
persistent telemetry.

## Camera Telemetry

`StageComponent.observeCamera()` exposes independent hooks for viewport changes:

* `onCenter` – Fired when the camera recentres (initial mount or explicit focus). Payload
  includes `reason`, `current`, `target`, and the canvas bounds.
* `onScroll` – Fired for panning gestures. Includes `delta`, `pointerId`, and viewport
  snapshots.
* `onZoom` – Fired for wheel or pinch zoom events. Includes the zoom factor, pointer
  position, and world coordinates at the focus point.

`StageController` wires these observers through the `cameraTelemetry` option and cleans up
subscriptions by invoking the teardown callback returned from `observeCamera()`.

## Quality Gates

* `layout-editor/tests/layout-editor-store.instrumentation.test.ts` asserts deterministic
  event sequences for drag and canvas resize flows.
* `layout-editor/tests/stage-camera.test.ts` covers camera telemetry hooks and verifies
  the emitted viewport snapshots.

## Navigation

- [Documentation index](./README.md)
- Related: [UI performance](./ui-performance.md)
- Related: [State layer overview](../src/state/README.md)
