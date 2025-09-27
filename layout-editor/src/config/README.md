# Configuration

Configuration sources define how the editor loads domain-specific element metadata, attribute groups, and seed layouts. The logic here resolves the active configuration, validates incoming payloads, and exposes defaults for callers that need deterministic fallback data.

## Files

- `domain-source.ts` – Loads the configured domain bundle (builtin or vault JSON), validates payloads, exposes helper types for seed layouts, and emits descriptive errors when configuration is invalid.

## Conventions & Extension Points

- Always route configuration reads through the exported functions instead of accessing storage directly. They handle caching, validation, and default materialisation.
- When introducing new configuration keys, update both the TypeScript interfaces and validation logic before extending the persisted schema. Document the new fields in the [domain configuration guide](../../docs/domain-configuration.md).
- Domain source selection is controlled by the settings layer; new sources should integrate with [`../settings`](../settings/README.md) so users can toggle them at runtime.
