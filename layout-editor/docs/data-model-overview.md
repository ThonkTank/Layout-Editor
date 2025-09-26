# Layout Editor – Data Model Overview

## Layout tree service

The editor no longer keeps element relationships in a flat array. A dedicated `LayoutTree`
model lives in `src/model/layout-tree.ts` and is responsible for:

- O(1) lookup of elements by `id` via an internal `Map`.
- Owning the canonical parent/child relationship while exposing immutable snapshots for
  read access.
- Validating parent changes (preventing self-parenting or cycles) before mutating the
  structure.
- Keeping container order stable during reorder operations and sanitising missing or
  invalid child references when hydrating persisted layouts.

The tree stores mutable `LayoutElement` objects so UI components can continue to edit the
same object references. The canonical list of child identifiers lives inside the tree and
is copied onto the element object whenever snapshots are produced. Container nodes expose
an empty `children` array to keep compatibility with existing container helpers, while
leaf nodes omit the property.

## Store integration

`LayoutEditorStore` now delegates every structural mutation to `LayoutTree`. Instead of
manually pushing/popping `children` arrays, store methods call the tree service to:

- Insert new elements (with optional parent assignment).
- Remove elements, automatically detaching their children.
- Re-parent elements and move children inside a container.

After each mutation the store synchronises its public state via a tree snapshot to ensure
listeners and history snapshots always reflect the canonical structure.

Undo/redo snapshots serialise through the tree, guaranteeing that replayed snapshots and
exported JSON remain consistent.

## LayoutElement type safety

`LayoutElementType` is now derived from the auto-generated component manifest. This
produces a literal union of registered element types and prevents invalid element type
strings at compile time.

The `children` property on `LayoutElement` is now documented as a derived field so
consumers treat it as read-only output from the tree service.

## Contract summary

1. `LayoutTree` is the single source of truth for parent/child relationships.
2. Store clients should continue to rely on `LayoutEditorStore` APIs—direct mutation of
   `children` arrays is ignored on the next snapshot.
3. Containers with no children expose an empty array, preserving existing UI logic.
4. Reparenting and reordering must go through the store so validation rules run and
   history snapshots remain in sync.
