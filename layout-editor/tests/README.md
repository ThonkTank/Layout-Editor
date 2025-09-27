# Tests

In diesem Ordner liegen alle automatisierten Tests für den Layout-Editor. Die Dateien werden via esbuild gebündelt und anschließend als Node-Module ausgeführt.

## Inhalte
- [`helpers/`](helpers) – Gemeinsame Fixtures und Utilities für Tests.
  - [`container-fixtures.ts`](helpers/container-fixtures.ts) – Stellt vorkonfigurierte Container-Bäume und Drag-Szenarien für Stage- und Store-Tests bereit.
- **Testdateien (alphabetisch)**
  - [`api-versioning.test.ts`](api-versioning.test.ts) – Prüft API-Level, Schema-Migrationen und Kompatibilität.
  - [`container-relayout.test.ts`](container-relayout.test.ts) – Prüft stilles Relayout bei Drag- und Resize-Szenarien über alle Container-Varianten.
  - [`domain-configuration.test.ts`](domain-configuration.test.ts) – Validiert Domain-Source-Handling und Sicherheitsmechanismen.
  - [`history-limits.test.ts`](history-limits.test.ts) – Sicherstellt Undo/Redo-Grenzen und Snapshot-Verwaltung.
  - [`i18n-loading.test.ts`](i18n-loading.test.ts) – Prüft Übersetzungs-Ladepfade und Fallback-Strategien.
  - [`layout-editor-store.instrumentation.test.ts`](layout-editor-store.instrumentation.test.ts) – Überwacht Stage-Interaktions-Telemetrie für Bewegungen, Canvas-Resize und Clamping.
  - [`layout-editor-store.test.ts`](layout-editor-store.test.ts) – Deckt Store-Reducer, Aktionen und Selektoren ab.
  - [`layout-tree.test.ts`](layout-tree.test.ts) – Testet den Layout-Baum und Kind-Verknüpfungen.
  - [`persistence-errors.test.ts`](persistence-errors.test.ts) – Überwacht Fehlerszenarien und Banner-Anzeigen.
  - [`stage-camera.test.ts`](stage-camera.test.ts) – Stellt sicher, dass StageController-Zentrierung, Scrollen, Zoomen und Fokusereignisse Telemetrie korrekt melden.
  - [`stage-component.test.ts`](stage-component.test.ts) – Simuliert Stage-Drags mit mehreren Elementen und prüft Cursor-Caches sowie gebatchte Store-Updates.
  - [`ui-component.test.ts`](ui-component.test.ts) – Fokus auf UIComponent-Lebenszyklus, Listener und Cleanup.
  - [`ui-diff-renderer.test.ts`](ui-diff-renderer.test.ts) – Prüft DiffRenderer-Verhalten bei Reordering und Entfernen.
  - [`view-registry.test.ts`](view-registry.test.ts) – Validiert Registrierungs-/Deregistrierungs-Guards.
- [`run-tests.mjs`](run-tests.mjs) – Hilfsskript zum Bündeln & Ausführen der Tests (lokal).

## Konventionen
- **Dateinamen**: Alle Tests enden auf `.test.ts`. Neue Tests müssen sich an die alphabetische Sortierung halten, da `run-tests.mjs` Dateien nach Namen verarbeitet.
- **Ausführung**: Lokal via `node ../scripts/run-tests.mjs` oder `npm test` (ruft das Skript mit Caching auf). CI verwendet dieselbe Pipeline.
- **Test-Setup**: Test-Utilities gehören in `tests/` oder `src/utils/`. Importiere sie relativ und vermeide globale State-Leaks.
- **Snapshots**: Statt statischer Snapshots werden Assertions bevorzugt, um Renderer-Stabilität sicherzustellen.

## Weiterführende Dokumentation
- Tooling- und Runner-Details: [`../docs/tooling.md`](../docs/tooling.md)
- Architektur-Kontext der Module: [`../src/README.md`](../src/README.md)
- Projektweite Nutzung & Workflows: [`../../README.md`](../../README.md)

## To-Do

- Regressionstest für unveränderliche Store-Snapshots: siehe [`../../todo/store-snapshot-immutability-tests.md`](../../todo/store-snapshot-immutability-tests.md).
