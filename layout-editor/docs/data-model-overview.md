# Layout Editor – Data Model Overview

## Layout tree service

The editor no longer keeps element relationships in a flat array. A dedicated `LayoutTree`
model lives in `src/model/layout-tree.ts` and is responsible for:

- O(1) lookup of elements by `id` via an internal `Map`.
- Owning the canonical parent/child relationship while enforcing validation during
  mutations.
- Validating parent changes (preventing self-parenting or cycles) before mutating the
  structure.
- Keeping container order stable during reorder operations and sanitising missing or
  invalid child references when hydrating persisted layouts.

`LayoutTree` keeps mutable node objects internally so store commands can operate on shared
references, but every public snapshot is re-cloned before leaving the store. The tree
therefore defines the canonical order and parenting data while the `LayoutEditorStore`
converts that mutable state into detached views.

## Store integration

`LayoutEditorStore` delegates every structural mutation to `LayoutTree`. Instead of
manually pushing/popping `children` arrays, store methods call the tree service to:

- Insert new elements (with optional parent assignment).
- Remove elements, automatically detaching their children.
- Re-parent elements and move children inside a container.

After each mutation the store synchronises its public state via a tree snapshot to ensure
listeners and history snapshots always reflect the canonical structure.

Instrumentation of these transitions is described in the [stage instrumentation guide](./stage-instrumentation.md), which
lists the interaction telemetry events and the mandatory payload fields observers can rely on.

### Snapshot semantics

- `LayoutEditorStore` uses `cloneLayoutElement` to deep-clone every node when capturing
  state, guaranteeing that emitted `state` events and undo/redo snapshots are detached
  copies.
- Clones include derived arrays (`attributes`, `children`, `options`), optional
  `layout`/`viewState` objects and maintain JSON-serialisable payloads to keep persistence
  deterministic.
- Because snapshots are clones, UI code must apply edits through store commands such as
  `applyElementSnapshot` or `moveElement` rather than mutating emitted objects in-place.

Undo/redo snapshots serialise through the tree, guaranteeing that replayed snapshots and
exported JSON remain consistent.

## LayoutElement type safety

`LayoutElementType` is now derived from the auto-generated component manifest. This
produces a literal union of registered element types and prevents invalid element type
strings at compile time.

The `children` property on `LayoutElement` is a derived field so consumers treat it as
read-only output from the tree service.

## Schema highlights

`LayoutElement` exposes more than structural geometry. The store guarantees the following
fields stay in sync with the persisted layout schema:

- `label`, `description`, `placeholder` and `defaultValue` are UI-facing content strings
  that must flow through the store's snapshot/apply helpers to keep history diffs minimal.
- `options` and `attributes` are always cloned arrays so command handlers can replace them
  atomically; callers should avoid mutating them directly.
- `layout` carries container alignment metadata when present and is cloned to avoid
  leaking mutable references across snapshots.
- `viewBindingId` and `viewState` bridge into the preview runtime; both are serialisable
  and emitted as detached copies.

## Contract summary

1. `LayoutTree` is the single source of truth for parent/child relationships.
2. Store clients should continue to rely on `LayoutEditorStore` APIs—direct mutation of
   `children` arrays is ignored on the next snapshot.
3. Containers with no children expose an empty array, preserving existing UI logic.
4. Reparenting and reordering must go through the store so validation rules run and
   history snapshots remain in sync.

## Navigation

- [Documentation index](./README.md)
- Related: [Layout history design](./history-design.md)
