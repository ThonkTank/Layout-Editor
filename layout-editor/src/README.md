# `src/` – Layout Editor Modulübersicht

Der `src/`-Ordner enthält den TypeScript-Quellcode des Layout Editors. Er ist nach Zustandsverwaltung, Presentern, UI-Komponenten sowie begleitenden Utilities gegliedert. Dieses Dokument listet alle zentralen Dateien und Unterordner mit ihren Aufgaben und verweist auf weiterführende Dokumentation.

## Wurzeldateien

- [`main.ts`](main.ts) – Registriert den `LayoutEditorView`, Ribbon-/Command-Aktionen und das Plugin-API; injiziert Styles und räumt beim Unload auf.
- [`index.ts`](index.ts) – Re-exportiert Plugin, API-Typen, Registry- und Library-Helfer für externe Konsumenten.
- [`css.ts`](css.ts) – Bündelt das Editor-Styling als Template-String.
- [`types.ts`](types.ts) – Gemeinsame Typdefinitionen für Layout-Elemente, Container und Snapshots.
- [`utils.ts`](utils.ts) – Hilfsfunktionen wie Clamping, Deep-Clones und Vergleichs-Utilities.
- [`history.ts`](history.ts) – Undo/Redo-Verwaltung für `LayoutSnapshot`-Sequenzen.
- [`view.ts`](view.ts) – Dünner Koordinator, der Store und Presenter instanziiert, Inspector/Popover koppelt sowie globale Shortcuts verarbeitet.
- [`attribute-popover.ts`](attribute-popover.ts) – Steuert das Attribut-Popover inklusive Positionierung und Synchronisation mit dem Store.
- [`inspector-panel.ts`](inspector-panel.ts) – Rendert Inspector-Formulare und synchronisiert Änderungen zurück zum Store.
- [`element-preview.ts`](element-preview.ts) – Delegiert Canvas-Vorschauen an Element-spezifische Komponenten.
- [`inline-edit.ts`](inline-edit.ts) – Stellt einen generischen `contentEditable`-Editor bereit.
- [`definitions.ts`](definitions.ts) – Element- und Attribut-Registry inklusive Label-Helfern und Defaults.
- [`view-registry.ts`](view-registry.ts) – Registry für externe View-Bindings und Erweiterungspunkte.
- [`element-picker-modal.ts`](element-picker-modal.ts) – Modal zum Hinzufügen neuer Elementtypen.
- [`layout-library.ts`](layout-library.ts) – Persistenz-Layer für gespeicherte Layouts und Vault-Synchronisierung.
- [`layout-picker-modal.ts`](layout-picker-modal.ts) – UI zur Auswahl vorhandener Layouts.
- [`name-input-modal.ts`](name-input-modal.ts) – Einfacher Modal zur Benennung neuer Layouts.
- [`search-dropdown.ts`](search-dropdown.ts) – Autocomplete-Helfer für Eingabefelder.
- [`seed-layouts.ts`](seed-layouts.ts) – Legt Standard-Layouts beim ersten Start an.
- [`elements/ui.ts`](elements/ui.ts) – UI-Helfer (Buttons, Inputs, Statusanzeigen) für View und Modals.

## Zustandsverwaltung

- [`state/`](state) – Kapselt den zentralen Store.
  - [`layout-editor-store.ts`](state/layout-editor-store.ts) – Verwaltet Canvas, Elemente, Auswahl, Drag- und History-State und emittiert Änderungsereignisse.
  - [`interaction-telemetry.ts`](state/interaction-telemetry.ts) – Stellt Observer- und Logger-Hooks für Stage-Interaktionen bereit; Details in [`../../docs/stage-instrumentation.md`](../../docs/stage-instrumentation.md).

Weiterführende Details zum Datenmodell und zur Store-Architektur findest du in [`../docs/data-model-overview.md`](../docs/data-model-overview.md) und [`../docs/history-design.md`](../docs/history-design.md).

## Presenter-Schicht

- [`presenters/`](presenters) – Orchestriert DOM-Komponenten auf Basis des Stores.
  - [`header-controls.ts`](presenters/header-controls.ts) – Zeichnet Header/Exportbereich, öffnet Picker, verwaltet Canvas-Größen und orchestriert Import/Export.
  - [`stage-controller.ts`](presenters/stage-controller.ts) – Steuert Bühne und Kamera, synchronisiert Pointer-Interaktionen mit dem Store.
  - [`structure-panel.ts`](presenters/structure-panel.ts) – Rendert den Strukturbaum, behandelt Drag/Reorder und fokussiert Elemente auf der Bühne.

Ausführliche UI- und Performance-Hinweise liefert [`../docs/ui-performance.md`](../docs/ui-performance.md).

## UI-Komponenten

- [`ui/`](ui) – Enthält wiederverwendbare UI-Komponenten.
  - [`components/`](ui/components) – `UIComponent`-basierte Bausteine.
    - [`component.ts`](ui/components/component.ts) – Basisklasse inklusive Lifecycle- und Listener-Management.
    - [`editor-shell.ts`](ui/components/editor-shell.ts) – Host für Header, Stage, Inspector samt Panel-Resizer.
    - [`stage.ts`](ui/components/stage.ts) – DOM- und Pointer-Logik der Bühne.
    - [`structure-tree.ts`](ui/components/structure-tree.ts) – Strukturbaum mit Drag/Drop und Reorder.
    - [`primitives.ts`](ui/components/primitives.ts) – Wrapper für Buttons, Felder, Stacks und Statusanzeigen.
  - [`editor-menu.ts`](ui/editor-menu.ts) – Kontextmenü für Inspector und Schnellaktionen.
  - [`element-tree.ts`](ui/element-tree.ts) – Generische Baumansicht für Element-Browser und Picker.

Weitere Design- und Interaktionsrichtlinien dokumentiert [`../docs/ui-performance.md`](../docs/ui-performance.md).

## Elementkomponenten

- [`elements/`](elements) – Kapselt die Implementierungen für einzelne Layout-Elementtypen.
  - [`base.ts`](elements/base.ts) – Gemeinsame Interfaces für Preview- und Inspector-Kontexte.
  - [`registry.ts`](elements/registry.ts) – Lädt alle Komponenten aus `./components`.
  - [`component-manifest.ts`](elements/component-manifest.ts) – Auto-generiertes Verzeichnis aller Komponenten.
  - [`components/`](elements/components) – Spezifische Komponenten pro Elementtyp (Preview, Inspector, Defaults).
  - [`shared/`](elements/shared) – Gemeinsame Basisklassen und Container-Vorschau.

Ergänzende Registrierungs- und API-Hinweise liefert [`../docs/view-registry.md`](../docs/view-registry.md).

## Konfiguration & Internationalisierung

- [`config/`](config) – Konfigurationswerte und Konstantsammlungen für Editor-Features.
- [`i18n/`](i18n) – Übersetzungsdateien und Loader für Editor-Strings.

Die I18n-Ladewege sind in [`../docs/i18n.md`](../docs/i18n.md) erläutert.

## Tests & Entwicklungsunterstützung

Die Test-Suite für Store- und UI-Verhalten liegt eine Ebene höher unter [`../tests/`](../tests). Einstiegspunkt ist [`../tests/run-tests.mjs`](../tests/run-tests.mjs). Persistenz-, API- und Fehlerfall-Analysen findest du in [`../docs/persistence-errors.md`](../docs/persistence-errors.md) und [`../docs/plugin-api.md`](../docs/plugin-api.md).

## Datenfluss (Kurzfassung)

1. UI-Interaktionen (Stage, Struktur, Header, Inspector) rufen Methoden des `LayoutEditorStore` auf.
2. Der Store aktualisiert Zustand und History und emittiert Ereignisse.
3. Presenter und `view.ts` reagieren auf diese Ereignisse, aktualisieren DOM-Komponenten und synchronisieren Inspector/Popover.
4. Registrierungen (`definitions.ts`, `view-registry.ts`) und die Layout-Bibliothek (`layout-library.ts`) speisen neue Daten zurück in den Store.

Weitere Architekturentscheidungen sind im Wurzel-README sowie in [`../docs/history-design.md`](../docs/history-design.md) dokumentiert.

## To-Do

- `LayoutEditorStore` liefert tief geklonte Snapshots. UI-Schichten dürfen Objekte als Draft verwenden, müssen Änderungen aber über Befehle wie `moveElement`, `resizeElement`, `offsetChildren` oder `applyElementSnapshot` zurückspielen.
