# Utilities

Utility helpers support state and model modules with reusable traversal logic that would otherwise be duplicated across presenters or store routines.

## Files

- `tree-helpers.ts` – Provides traversal helpers (collect descendants/ancestors) around `LayoutTree` to prevent invalid reparenting and to implement validation when moving elements between containers.

## Conventions & Extension Points

- Utilities should remain stateless and focused on pure data transformations so they can be reused in stores, presenters, and tests without side effects.
- Favour `LayoutTree` APIs when walking hierarchy data. Helpers that need direct store access should live alongside the store instead.
- When adding new helpers, document their constraints and intended call sites here and, if they affect performance-critical paths, cross-link to the [UI performance notes](../../docs/ui-performance.md).
