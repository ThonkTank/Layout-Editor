# UI Rendering Pipeline

The component layer now renders through a lightweight diffing helper that keeps DOM mutations scoped to the elements that actually changed. This section captures the important pieces so future updates stay aligned with the incremental architecture.

## Dokumentationsinventar

| Thema | Technische Quelle | Ergänzende Module |
| --- | --- | --- |
| Diff-Rendering & Lifecycle | [`../src/ui/components/diff-renderer.ts`](../src/ui/components/diff-renderer.ts), [`../src/ui/components/component.ts`](../src/ui/components/component.ts) | Tests: [`../tests/ui-diff-renderer.test.ts`](../tests/ui-diff-renderer.test.ts) |
| Stage-Rendering & Kamera | [`../src/ui/components/stage.ts`](../src/ui/components/stage.ts), [`../src/presenters/stage-controller.ts`](../src/presenters/stage-controller.ts) | User-Wiki: [Stage-Instrumentierung](../../docs/stage-instrumentation.md) |
| Strukturbaum-Diffing | [`../src/ui/element-tree.ts`](../src/ui/element-tree.ts), [`../src/presenters/structure-panel.ts`](../src/presenters/structure-panel.ts) | User-Wiki: [Strukturbaum](../../docs/ui-components/structure-tree.md) |
| Export- & Snapshot-Pipeline | [`../src/state/layout-editor-store.ts`](../src/state/layout-editor-store.ts) | Tests: [`../tests/layout-editor-store.instrumentation.test.ts`](../tests/layout-editor-store.instrumentation.test.ts) |

## Diff-driven updates

- `DiffRenderer` accepts a host container, a key extractor, and lifecycle hooks (`create`, `update`, `destroy`).
- Each rendered node receives a scoped cleanup handle created through `UIComponent.createScope()`. Event listeners and other transient resources should be registered on that scope so they are released automatically when the node leaves the tree.
- During `patch`, the helper reuses existing nodes when their key matches, moves them into the correct order, applies the `update` hook, and only creates/removes nodes for new or deleted keys. Removed nodes run `destroy`, dispose their scope, and are then detached from the DOM.

## Stage component

### Sequenz: Fokus-Handshake
1. Tree/Presenter aktualisiert die Store-Auswahl (`LayoutEditorStore.selectElement`).
2. `StageController` erhält den Snapshot, patched `StageComponent` und ruft `focusElement()` bei Bedarf.
3. `StageComponent` emittiert Telemetrie (`StageCameraObserver`), die in [`../../docs/stage-instrumentation.md`](../../docs/stage-instrumentation.md#kamera-telemetrie) mit Nutzerperspektive dokumentiert ist.
4. Der Nutzer-Workflow ist zusätzlich im User-Wiki unter [Stage-Fokus & Navigation](../../docs/stage-instrumentation.md#kamera-telemetrie) beschrieben.

- `StageComponent` keeps a keyed renderer over canvas nodes. Layout mutations pass through `DiffRenderer`, ensuring that drag/resize operations only repaint the affected element tiles instead of rebuilding the entire stage. See the implementation in [`src/ui/components/stage.ts`](../src/ui/components/stage.ts).
- Element cursors are cached per snapshot. Pointer handlers resolve parents/children via the cursor map so they never scan the full element list and they can honour the immutable snapshots the store publishes.
- Selection state is derived inside the shared `syncElementNode` update hook, so toggling selection or dimensions does not trigger unnecessary reflows.
- Element-specific listeners (pointer move/leave/down) register on the per-node scope. When an element disappears, its interaction listeners disappear with it, preventing leaks between sessions.
- Drag interactions run inside `LayoutEditorStore.runInteraction()`. The store batches `move`/`resize` plus layout reflows into a single state emission per frame, so the DOM stays in sync without flooding listeners.
- Drag interactions now call `LayoutEditorStore.flushExport()` once the pointer is released. During the drag, frame updates emit only `state` events, batching export payloads until the interaction settles so JSON serialization does not run on every frame.
- `StageController` initialises the component with a snapshot, pre-creates container defaults via `ensureContainerDefaults()`, subscribes to the store, and tears everything down in `dispose()`. Its constructor also wires optional camera observers through `StageComponent.observeCamera()`. Details live in [`src/presenters/stage-controller.ts`](../src/presenters/stage-controller.ts).
- `focusElement()` recentres the camera on the requested element, emits a `StageCameraObserver` event with reason `focus`, and immediately applies the translated transform so other presenters (e.g. the structure panel) can keep camera state and telemetry in lock-step.
- Camera motions emit `StageCameraObserver` telemetry hooks. Register them through `StageController` and clean them up as described in [Stage instrumentation › Kamera-Telemetrie](../../docs/stage-instrumentation.md#kamera-telemetrie). The `focus` reason is used whenever a tree-driven selection jumps the camera, making analytics correlation trivial. Focus propagation across tree and stage is mirrored in [`src/presenters/structure-panel.ts`](../src/presenters/structure-panel.ts).

## Structure tree component

### Sequenz: Drag-Reparenting
1. Tree startet Drag (`onDragStateChange(started)`); Presenter setzt `store.setDraggedElement`.
2. Beim Drop ruft der Presenter `store.assignElementToContainer()`.
3. Store publiziert Snapshot; Tree und Stage lesen `draggedElementId === null` und räumen Overlays auf.
4. Die Anwenderführung siehe [User-Wiki › Stage-Bedienkonzept](../../docs/stage-instrumentation.md#tests--qualit%C3%A4tssicherung).

- The structure tree uses nested diff renderers: the root list and every container node get their own keyed renderer, allowing selective expansion/collapse updates without recreating sibling entries.
- Entry metadata (title/meta spans, child list, and drag state) stays cached across updates; the diff cycle refreshes text, selection, and child counts in place.
- Drag-and-drop feedback and drop-zone listeners are routed through component scopes so highlights and drag signals reset automatically after reorder/reparent operations. The tree uses [`StructurePanelPresenter.createStateSnapshot`](../src/presenters/structure-panel.ts) to keep drag state and overlays aligned with the store snapshots.
- `StructurePanelPresenter` feeds selection back into the store and immediately calls `StageController.focusElement()` so the camera jump and the telemetry event fire before the next render. This keeps the canvas centred on the same element as the tree.
- `onDragStateChange` propagates into `LayoutEditorStore.setDraggedElement()`. Stage overlays and the tree share this state, so active drags stay visually aligned across presenters.
- Reparent callbacks call `assignElementToContainer()` directly; the store enforces container invariants and publishes the cleared `draggedElementId` when the move finishes.
- Reorder callbacks calculate offsets inside the current parent and delegate to `moveChildInContainer()`. Invalid moves (different parents, missing indexes) short-circuit before mutating state, keeping telemetry noise-free.
- After a drop the store resets `draggedElementId`, which the tree and stage consume on the next snapshot to dismiss drag affordances.

## Export payload batching

- `LayoutEditorStore` memoises the last export payload and marks it dirty when state changes. Pointer-driven frame updates skip immediate serialization so drag gestures only fan out cheap `state` notifications.
- `runInteraction()` defers event delivery until the enclosing interaction completes. Multiple mutations inside the same frame collapse into one state emission, and the exported snapshot is only recomputed when at least one mutation requests it.
- `flushExport()` recomputes and publishes the JSON snapshot on demand. Components with long-running interactions (e.g. the stage) call it after drags/resizes complete, giving the export textarea an up-to-date view without flooding listeners during the interaction.

## Listener lifecycle

- `UIComponent.createScope()` centralises cleanup. Always register DOM listeners or observers for dynamic nodes on the provided scope. Global interactions (e.g. `window` pointer tracking) remain on the component-level cleanup stack and are explicitly torn down by the interaction handlers.
- Tests assert that removing a node tears down its scope-bound listeners, providing a regression guard against future leaks.

## Header controls feedback

### Sequenz: Persistenz-Fehlerfall
1. Header löst `saveLayoutToLibrary` aus.
2. Fehler wird normalisiert (`describeLayoutPersistenceError`) und an Banner & Notice gespiegelt.
3. Erfolgreiche Wiederholung ruft `clearPersistenceError()` und entfernt Banner/Notice synchron.
4. Für Nutzer:innen ist der Erwartungswert im User-Wiki unter [Fehlerdiagnose & Qualitätschecks](../../docs/README.md#fehlerdiagnose--qualit%C3%A4tschecks) festgehalten.

- `HeaderControlsPresenter` wires the status banner component so persistence failures surface inline. The presenter normalises thrown errors via `describeLayoutPersistenceError()`, maps them to a deterministic code/description/help trio, and mirrors the same message through an Obsidian `Notice` when the host runtime exposes it. Source: [`src/presenters/header-controls.ts`](../src/presenters/header-controls.ts).
- `showPersistenceError()` caches the view model, instantiates `StatusBannerComponent` on demand, and mirrors the `noticeMessage` through `showNotice()`, ensuring banner and Obsidian notice stay in sync.
- `isSavingLayout` keeps the banner stable during retries; once saving succeeds, `clearPersistenceError()` resets the banner and cached error. Import failures opt out of banners and only surface as notices, avoiding stale error chrome.
- The derived banner state deduplicates raw error messages that already match the curated variants, ensuring the UI renders deterministic, localised content while still exposing unhandled error strings for diagnosis.

Keeping these rules in mind ensures the rendering layer remains incremental, predictable, and cheap to update even for large documents.

## Test coverage & follow-ups

- [`stage-component.test.ts`](../tests/stage-component.test.ts) exercises pointer interactions, drag batching (`runInteraction`) and class toggling for interaction states.
- [`stage-camera.test.ts`](../tests/stage-camera.test.ts) locks down telemetry sequences for focus, scroll and zoom together with [`StageController`](../src/presenters/stage-controller.ts).
- [`layout-editor-store.instrumentation.test.ts`](../tests/layout-editor-store.instrumentation.test.ts) asserts `clamp:step` emission and canvas snapping behaviour.
- **Gap:** Keyboard shortcuts (tree ↔ stage) are not covered by automated tests. Follow-up To-Do: [`../todo/ui-shortcut-coverage.md`](../todo/ui-shortcut-coverage.md).

## Navigation

- [Documentation index](./README.md)
- Related: [View Registry](./view-registry.md)

## Offene Aufgaben

- Diagramme & Accessibility-Guidelines ergänzen: [`ui-accessibility-and-diagrams.md`](../todo/ui-accessibility-and-diagrams.md).
- Shortcut-Testabdeckung ergänzen: [`ui-shortcut-coverage.md`](../todo/ui-shortcut-coverage.md).
