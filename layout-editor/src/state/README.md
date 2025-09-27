# State

The state layer coordinates mutable editor state, history, and event emission. It exposes the `LayoutEditorStore` as the single entry point for canvas interactions, selection, and persistence, producing deep-cloned snapshots for the view layer while delegating structural integrity to the model.

## Files

- `layout-editor-store.ts` – Central store that orchestrates element CRUD, canvas sizing, selection, drag state, export payload caching, and undo/redo integration via `LayoutHistory`.
- `interaction-telemetry.ts` – Consolidated observer/logger hub for stage interactions; exposes setters for runtime probes and the event union defined in the [stage instrumentation guide](../../docs/stage-instrumentation.md).

## Conventions & Extension Points

- All UI and presenter code should mutate editor state exclusively through `LayoutEditorStore` methods. Direct mutations of element arrays will be overwritten on the next snapshot because the store always re-synchronises from the model tree. Use dedicated commands such as `moveElement`, `resizeElement`, `offsetChildren`, and `applyElementSnapshot` to describe changes instead of mutating `LayoutElement` instances in-place.
- `getState()` and emitted `state` events return detached clones. Mutating snapshots has no side effects; to persist inline edits, feed the mutated draft back through `applyElementSnapshot` or another command.
- New state transitions must record history through `commitHistory()` so undo/redo stays consistent; consult the [history design notes](../../docs/history-design.md) for patch guidelines.
- When expanding the public state shape, update the exported `LayoutEditorState` type and adjust serialization/restore logic. Use immutable snapshots for outward-facing state to keep observers deterministic.
- Structural behaviour (parenting, child order, validation) is implemented in the [`model`](../model/README.md) layer. Prefer to add tree capabilities there and call them from the store.
- For a data contract overview, refer to the [data model documentation](../../docs/data-model-overview.md). Keep store exports aligned with the documented schema so persistence and tests continue to pass.
- Stage telemetry must be instrumented through `stageInteractionTelemetry`. Extend the `StageInteractionEvent` union and observer/logger interfaces together, keep payloads JSON-serialisable, update [`layout-editor-store.instrumentation.test.ts`](../../tests/layout-editor-store.instrumentation.test.ts), and document the new events in the [stage instrumentation guide](../../docs/stage-instrumentation.md). Always reset hooks via `resetStageInteractionTelemetry()` in tests to avoid leaks.
