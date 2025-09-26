# Tests

In diesem Ordner liegen alle automatisierten Tests für den Layout-Editor. Die Dateien werden via esbuild gebündelt und anschließend als Node-Module ausgeführt.

## Inhalte
- [`api-versioning.test.ts`](api-versioning.test.ts) – Prüft API-Level, Schema-Migrationen und Kompatibilität.
- [`domain-configuration.test.ts`](domain-configuration.test.ts) – Validiert Domain-Source-Handling und Sicherheitsmechanismen.
- [`history-limits.test.ts`](history-limits.test.ts) – Sicherstellt Undo/Redo-Grenzen und Snapshot-Verwaltung.
- [`i18n-loading.test.ts`](i18n-loading.test.ts) – Prüft Übersetzungs-Ladepfade und Fallback-Strategien.
- [`layout-editor-store.test.ts`](layout-editor-store.test.ts) – Deckt Store-Reducer, Aktionen und Selektoren ab.
- [`layout-tree.test.ts`](layout-tree.test.ts) – Testet den Layout-Baum und Kind-Verknüpfungen.
- [`persistence-errors.test.ts`](persistence-errors.test.ts) – Überwacht Fehlerszenarien und Banner-Anzeigen.
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
- Bekannte Lücken in Store/History-Tests: [`../../todo/layout-store-consistency.md`](../../todo/layout-store-consistency.md)
- Projektweite Nutzung & Workflows: [`../../README.md`](../../README.md)
