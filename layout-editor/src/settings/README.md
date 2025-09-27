# Settings

Settings modules integrate the layout editor with Obsidian's preferences UI and expose runtime toggles that affect configuration sources and editor behaviour.

## Struktur & Dateien

```text
settings/
├── README.md (dieses Dokument)
├── domain-settings.ts – Quelle & Listener für Domänenkonfiguration
└── settings-tab.ts – Registriert den Obsidian-Settings-Tab und rendert Controls
```

- `domain-settings.ts` – Manages the active domain configuration source, persists the selection in `localStorage`, notifies listeners about changes, and renders the toggle control used in the settings tab.
- `settings-tab.ts` – Registers the plugin settings tab, wires Obsidian's `PluginSettingTab` lifecycle to our renderers, and disposes registered handlers when the tab hides.

## Conventions & Extension Points

- Keep settings rendering declarative: return disposer callbacks from helpers (e.g. `renderDomainConfigurationSetting`) so the tab can clean up listeners on hide.
- Persist new settings via Obsidian's storage APIs or `localStorage` consistently; reuse the `plugin.register` teardown hook when adding observers.
- Wenn Einstellungen Laufzeitdaten beeinflussen (z. B. Domänenquelle → Seed-Sync), registriere Change-Listener wie `onDomainConfigurationSourceChange` und delegiere an die zuständigen Services.
- Document user-facing workflows for new settings in the [domain configuration documentation](../../docs/domain-configuration.md) or other relevant guides under `docs/`.
- When adding new toggles, define the underlying state or configuration first (see [`../config`](../config/README.md)) and inject the render helper into `settings-tab.ts`.

## Validierungs-, Fallback- & Fehlerübersicht

| Mechanismus | Validierung | Fallback | Fehlerdarstellung & Referenzen |
| --- | --- | --- | --- |
| `loadFromStorage` | Ignoriert unbekannte oder invalide Werte und protokolliert Warnungen statt Exceptions.【F:layout-editor/src/settings/domain-settings.ts†L9-L29】 | Rückfall auf `"builtin"`, wenn kein valider Wert gelesen werden kann.【F:layout-editor/src/settings/domain-settings.ts†L7-L15】 | Konsole warnt; Dokumentation siehe [Domain-Konfiguration](../../docs/domain-configuration.md#validierungs--fallback-matrix). |
| `persistSource` | Fängt `localStorage`-Fehler ab (z. B. Safari Private Mode) und protokolliert sie.【F:layout-editor/src/settings/domain-settings.ts†L21-L32】 | Active Source bleibt unverändert, UI behält letzten bekannten Wert.【F:layout-editor/src/settings/domain-settings.ts†L32-L38】 | Warnungen erscheinen nur in der Konsole; Anwender folgen dem Fehlerbanner bei Persistenzproblemen (siehe [Persistenzfehler](../../docs/persistence-errors.md#fehlertypen--codes)). |
| Toggle-Rendering | Synchronisiert UI-Wert mit Runtime-Quelle und verhindert Drift bei externen Änderungen.【F:layout-editor/src/settings/domain-settings.ts†L40-L86】 | Falls Listener fehlschlägt, bleibt Toggle beim letzten Wert; Domain-Service fällt auf Defaults zurück (siehe [`../config`](../config/README.md#validierungen-fallbacks--fehlerpfade)). | UI synchronisiert Banner & Notices über die Persistenz-Schicht, sobald Domain-Service Fehler meldet. |

- Änderungen an Settings müssen die verlinkte Validierungs-Matrix in [`docs/domain-configuration.md`](../../docs/domain-configuration.md#validierungs--fallback-matrix) aktualisieren.
- Bei neuen Quellen sind Speicherfehler (z. B. mobile Geräte ohne `localStorage`) in [`docs/persistence-errors.md`](../../docs/persistence-errors.md) zu ergänzen.

## Offene Punkte

- Soll-Dokumentation der Einstellungen aktualisieren: [`documentation-audit-configuration-settings.md`](../../todo/documentation-audit-configuration-settings.md).
- Umgebungsspezifische Optionen (Offline-/Mobile-Storage) dokumentieren: [`domain-configuration-environment-docs.md`](../../todo/domain-configuration-environment-docs.md).
