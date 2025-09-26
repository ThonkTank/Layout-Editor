# Layout History Design

## Overview

The layout editor tracks state mutations through the `LayoutHistory` store. The store exposes the same public API as before (`push`, `undo`, `redo`, etc.), but the underlying storage now keeps a bounded sequence of structural patches instead of full snapshot copies. This reduces memory usage and makes undo/redo operations scale for large documents while preserving deterministic replay semantics.

## Patch-based Storage

Each history entry captures a forward patch (`redo`) and its inverse (`undo`):

* **Canvas changes** – updated width, height, and selected element id values are recorded when they differ from the previous snapshot.
* **Element mutations** – additions, removals, and updates only carry the affected `LayoutElement` payloads or ids. Arrays such as `attributes`, `children`, and `viewState` are deep-cloned for stability.
* **Ordering** – when the ordering of element ids changes (because of insertions, deletions, or explicit reordering), the target order is captured as a list of ids. The inverse order is stored for undo.

Applying a patch reconstructs a new snapshot by replaying the minimal operations against the prior state. Undo operations simply apply the inverse patch. Because both directions are materialized, the existing `restore` callback still receives a full snapshot clone and no caller adjustments are required.

## Bounded History Window

The history retains the most recent 50 transitions. When a new patch would exceed that limit, the oldest entry is pruned and its forward patch is folded into the baseline snapshot that seeds the remaining entries. The cursor (the number of applied patches) is shifted accordingly so the visible state remains stable. This strategy maintains redo correctness: even after pruning, redo continues to operate over the preserved window without dangling references.

## Replay Guarantees

Undo and redo both operate against the current snapshot rather than re-capturing state. `LayoutHistory` guards against re-entrant restores with the `isRestoring` flag and refuses to record pushes triggered during a replay. The accompanying tests (`tests/history-limits.test.ts`) exercise:

1. Enforcement of the 50-step cap while preserving redo of the surviving entries.
2. Accurate replay of complex element operations (create, reorder, update, delete, and canvas changes).

The diff-first approach keeps history storage proportional to the number of modifications instead of the size of the entire layout, while keeping the observable behaviour identical for consumers of the store.
