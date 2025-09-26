# State

The state layer coordinates mutable editor state, history, and event emission. It exposes the `LayoutEditorStore` as the single entry point for canvas interactions, selection, and persistence, producing immutable snapshots for the view layer while delegating structural integrity to the model.

## Files

- `layout-editor-store.ts` – Central store that orchestrates element CRUD, canvas sizing, selection, drag state, export payload caching, and undo/redo integration via `LayoutHistory`.

## Conventions & Extension Points

- All UI and presenter code should mutate editor state exclusively through `LayoutEditorStore` methods. Direct mutations of element arrays will be overwritten on the next snapshot because the store always re-synchronises from the model tree.
- New state transitions must record history through `commitHistory()` so undo/redo stays consistent; consult the [history design notes](../../docs/history-design.md) for patch guidelines.
- When expanding the public state shape, update the exported `LayoutEditorState` type and adjust serialization/restore logic. Use immutable snapshots for outward-facing state to keep observers deterministic.
- Structural behaviour (parenting, child order, validation) is implemented in the [`model`](../model/README.md) layer. Prefer to add tree capabilities there and call them from the store.
- For a data contract overview, refer to the [data model documentation](../../docs/data-model-overview.md). Keep store exports aligned with the documented schema so persistence and tests continue to pass.
