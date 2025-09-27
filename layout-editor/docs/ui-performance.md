# UI Rendering Pipeline

The component layer now renders through a lightweight diffing helper that keeps DOM mutations scoped to the elements that actually changed. This section captures the important pieces so future updates stay aligned with the incremental architecture.

## Diff-driven updates

- `DiffRenderer` accepts a host container, a key extractor, and lifecycle hooks (`create`, `update`, `destroy`).
- Each rendered node receives a scoped cleanup handle created through `UIComponent.createScope()`. Event listeners and other transient resources should be registered on that scope so they are released automatically when the node leaves the tree.
- During `patch`, the helper reuses existing nodes when their key matches, moves them into the correct order, applies the `update` hook, and only creates/removes nodes for new or deleted keys. Removed nodes run `destroy`, dispose their scope, and are then detached from the DOM.

## Stage component

- `StageComponent` keeps a keyed renderer over canvas nodes. Layout mutations pass through `DiffRenderer`, ensuring that drag/resize operations only repaint the affected element tiles instead of rebuilding the entire stage.
- Element cursors are cached per snapshot. Pointer handlers resolve parents/children via the cursor map so they never scan the full element list and they can honour the immutable snapshots the store publishes.
- Selection state is derived inside the shared `syncElementNode` update hook, so toggling selection or dimensions does not trigger unnecessary reflows.
- Element-specific listeners (pointer move/leave/down) register on the per-node scope. When an element disappears, its interaction listeners disappear with it, preventing leaks between sessions.
- Drag interactions run inside `LayoutEditorStore.runInteraction()`. The store batches `move`/`resize` plus layout reflows into a single state emission per frame, so the DOM stays in sync without flooding listeners.
- Drag interactions now call `LayoutEditorStore.flushExport()` once the pointer is released. During the drag, frame updates emit only `state` events, batching export payloads until the interaction settles so JSON serialization does not run on every frame.
- Camera motions emit `StageCameraObserver` telemetry hooks. Register them through `StageController` and clean them up as described in [Stage instrumentation › Kamera-Telemetrie](../../docs/stage-instrumentation.md#kamera-telemetrie).

## Structure tree component

- The structure tree uses nested diff renderers: the root list and every container node get their own keyed renderer, allowing selective expansion/collapse updates without recreating sibling entries.
- Entry metadata (title/meta spans, child list, and drag state) stays cached across updates; the diff cycle refreshes text, selection, and child counts in place.
- Drag-and-drop feedback and drop-zone listeners are routed through component scopes so highlights and drag signals reset automatically after reorder/reparent operations.

## Export payload batching

- `LayoutEditorStore` memoises the last export payload and marks it dirty when state changes. Pointer-driven frame updates skip immediate serialization so drag gestures only fan out cheap `state` notifications.
- `runInteraction()` defers event delivery until the enclosing interaction completes. Multiple mutations inside the same frame collapse into one state emission, and the exported snapshot is only recomputed when at least one mutation requests it.
- `flushExport()` recomputes and publishes the JSON snapshot on demand. Components with long-running interactions (e.g. the stage) call it after drags/resizes complete, giving the export textarea an up-to-date view without flooding listeners during the interaction.

## Listener lifecycle

- `UIComponent.createScope()` centralises cleanup. Always register DOM listeners or observers for dynamic nodes on the provided scope. Global interactions (e.g. `window` pointer tracking) remain on the component-level cleanup stack and are explicitly torn down by the interaction handlers.
- Tests assert that removing a node tears down its scope-bound listeners, providing a regression guard against future leaks.

Keeping these rules in mind ensures the rendering layer remains incremental, predictable, and cheap to update even for large documents.

## Navigation

- [Documentation index](./README.md)
- Related: [View Registry](./view-registry.md)
