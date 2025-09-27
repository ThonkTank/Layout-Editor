# Layout Editor Documentation Index

This directory collects the in-depth guides for the Layout Editor plugin. Use this
index to quickly identify the right document for your current task and to discover
related background material.

| Topic | Purpose | Read when… |
| --- | --- | --- |
| [Data Model Overview](./data-model-overview.md) | Explains the `LayoutTree` service, store integration, and type guarantees of layout elements. | You need to understand how structural mutations, snapshots, or type safety work in the editor core. |
| [Domain Configuration](./domain-configuration.md) | Describes how to load layout definitions from built-in defaults or vault JSON files and how to validate them. | You want to switch configuration sources, edit domain JSON, or troubleshoot validation rules. |
| [History Design](./history-design.md) | Details the patch-based history store, bounded history window, and replay guarantees. | You are debugging undo/redo behaviour or planning history extensions. |
| [Layout Library](./layout-library.md) | Documents vault storage paths, schema migrations, and validation rules for saved layouts. | You interact with persisted layouts, migrate schemas, or diagnose storage errors. |
| [Plugin API](./plugin-api.md) | Lists all public API methods, versioning helpers, and workflows for integrators. | You build or update external plugins that integrate with the Layout Editor. |
| [Persistence Errors](./persistence-errors.md) | Summarises banner behaviour and messaging for storage failures. | You design user-facing feedback for save/load failures or map error codes. |
| [UI Performance](./ui-performance.md) | Captures the diff-driven rendering pipeline and lifecycle expectations of UI components. | You optimise rendering logic or add UI components that must cooperate with the diff renderer. |
| [View Registry](./view-registry.md) | Explains registration, diagnostics, and error handling for external view bindings. | You integrate custom visualisations or need to inspect registered view bindings. |
| [Localization Guidelines](./i18n.md) | Shows how locale bundles are structured, overridden, and injected into presenters. | You add new UI strings, support additional locales, or test localisation behaviour. |
| [Tooling](./tooling.md) | Lists linting, formatting, and test commands that enforce repository quality. | You prepare contributions or verify CI-equivalent checks locally. |

## To-Do

- Shortcut-Workflows automatisiert testen: [`ui-shortcut-coverage.md`](../todo/ui-shortcut-coverage.md).
- Konfigurations- und Fehlerpfad-Dokumentation abgleichen: [`documentation-audit-configuration-settings.md`](../todo/documentation-audit-configuration-settings.md).
- Integrations- und API-Guides aktualisieren: [`documentation-audit-integration-api.md`](../todo/documentation-audit-integration-api.md).

For a high-level, user-facing overview of workflows and features, refer to the root
[`docs/`](../../docs/) directory.
