# Settings

Settings modules integrate the layout editor with Obsidian's preferences UI and expose runtime toggles that affect configuration sources and editor behaviour.

## Files

- `domain-settings.ts` – Manages the active domain configuration source, persists the selection in `localStorage`, notifies listeners about changes, and renders the toggle control used in the settings tab.
- `settings-tab.ts` – Registers the plugin settings tab, wires Obsidian's `PluginSettingTab` lifecycle to our renderers, and disposes registered handlers when the tab hides.

## Conventions & Extension Points

- Keep settings rendering declarative: return disposer callbacks from helpers (e.g. `renderDomainConfigurationSetting`) so the tab can clean up listeners on hide.
- Persist new settings via Obsidian's storage APIs or `localStorage` consistently; reuse the `plugin.register` teardown hook when adding observers.
- Document user-facing workflows for new settings in the [domain configuration documentation](../../docs/domain-configuration.md) or other relevant guides under `docs/`.
- When adding new toggles, define the underlying state or configuration first (see [`../config`](../config/README.md)) and inject the render helper into `settings-tab.ts`.
