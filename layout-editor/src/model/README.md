# Model

The model layer owns the canonical tree representation of layout elements. It provides efficient lookups, parent/child validation, and snapshot generation that the store and presenters consume when reacting to user input.

## Files

- `layout-tree.ts` – Maintains the element graph, ensuring unique identifiers, preserving insertion order, validating container relationships, and exposing immutable snapshots for the state layer.

## Conventions & Extension Points

- Extend `LayoutTree` with caution: keep internal nodes mutable for performance but return cloned objects (`cloneLayoutElement`) to callers to prevent accidental cross-frame mutation.
- Use tree helpers from [`../utils`](../utils/README.md) to guard against cycles when introducing new traversal behaviour.
- When adding new derived data (e.g. computed aggregations), expose dedicated accessors on the tree rather than mutating element payloads. Document the data contract in the [data model overview](../../docs/data-model-overview.md) if schema changes are introduced.

## Offene Punkte

- Konsistenz- und Vollständigkeitsprüfung siehe [`documentation-audit-state-model.md`](../../todo/documentation-audit-state-model.md).
