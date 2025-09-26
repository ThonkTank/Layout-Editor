# Layout-Editor

Der Layout-Editor ist ein Obsidian-Plugin zum Entwerfen komplexer Formular- und Dashboard-Layouts, die von anderen Plugins wiederverwendet werden können. Der Editor stellt eine Canvas-Ansicht, Element-Bibliotheken sowie eine Persistenzschicht für Layout-Dateien bereit.

## Kernfunktionen

- **Interaktive Editor-Ansicht** – Öffne den Layout-Editor als eigene Obsidian-View mit Canvas, Strukturbaum und Inspector, um Layouts visuell zu modellieren.
- **Modularer Store- & Presenter-Flow** – Bearbeitungen laufen über klar getrennte Daten- und Präsentationsschichten; so bleiben Automationen, Preview-Refreshs und Undo/Redo nachvollziehbar.
- **Erweiterbare Elementbibliothek** – Registriere eigene UI-Komponenten, profitiere vom diff-basierten Rendering und sichere dich über View-Registry-Schutzmechanismen gegen doppelte Registrierungen ab.
- **Layout-Bibliothek** – Speichere Layouts im Vault, lade sie erneut oder teile sie mit anderen Plugins. Details siehe
  [`layout-editor/docs/layout-library.md`](layout-editor/docs/layout-library.md). Persistenz-Statusmeldungen informieren über fehlgeschlagene Speichervorgänge und Export-Throttling schützt vor versehentlichen Mehrfachspeicherungen.
- **Versionierte Plugin-API** – `apiVersion` kennzeichnet das veröffentlichte API-Level, Helfer wie `isApiVersionAtLeast` und `withMinimumApiVersion` erlauben defensive Feature-Gates.
- **Schema-Migrationen** – Gespeicherte Layouts enthalten ein `schemaVersion`-Feld. Die Bibliothek führt Migrationen zentral aus und warnt bei fehlenden Pfaden oder zukünftigen Versionen.
- **Lokalisierungs-Unterstützung** – UI-Texte lassen sich pro Workspace umschalten; Übersetzungen folgen der Struktur aus [`layout-editor/docs/i18n.md`](layout-editor/docs/i18n.md).

## Nutzung & Workflows

1. **Editor öffnen**: Über das Ribbon-Icon oder den Befehl „Layout Editor öffnen“ wird die dedizierte View aktiviert.
2. **Datenquelle wählen**: Nutze den Domain-Source-Toggle, um zwischen Live-Daten, Mock-Daten und Offline-Snapshots zu wechseln.
3. **Layouts modellieren**: Elemente aus der Bibliothek auf die Arbeitsfläche ziehen, Eigenschaften im Inspector anpassen und optional View-Bindings zuweisen; visuelle Diffs zeigen sofort, welche Komponenten betroffen sind.
4. **Layout speichern**: Über die Speicher-Controls wird ein Layout unter einer ID im Vault abgelegt. Bestehende Einträge werden migrationssicher überschrieben, während das Persistenz-Banner den Erfolg oder Fehlerzustand signalisiert.
5. **Layouts exportieren/teilen**: Exportaktionen sind automatisch gedrosselt, um Duplikate zu vermeiden. Plugins können via API Layouts laden und mit `schemaVersion`-Checks gegen das aktuelle Schema absichern.
6. **Views schützen**: Die Registry verhindert Kollisionen oder unvollständige Deregistrierungen und meldet Konflikte direkt in der UI.

## Öffentliche API & Versionierung

- Jede Instanz von `LayoutEditorPlugin.getApi()` liefert ein Objekt mit `apiVersion` sowie den Helfern `isApiVersionAtLeast`, `assertApiVersion` und `withMinimumApiVersion`.
- Neue Features werden hinter Versionsprüfungen freigeschaltet. Konsumenten können so optional auf neue Funktionen reagieren, ohne ältere Plugin-Versionen zu brechen.
- Die aktuell ausgelieferte API-Version lautet `1.0.0`.
- Eine vollständige Referenz aller API-Methoden mit Workflows und Fehlerverhalten findet sich unter [`layout-editor/docs/plugin-api.md`](layout-editor/docs/plugin-api.md).

### Kompatibilitäts-Helfer

```ts
const api = plugin.getApi();
api.assertApiVersion("1.0.0");
const result = api.withMinimumApiVersion("1.1.0", () => useNewFeature());
```

Weitere Details zur API-Evolution und Migrationsregeln sind unter [`docs/api-migrations.md`](docs/api-migrations.md) beschrieben.

## Layout-Schema-Migrationen

Gespeicherte Layout-Dateien werden mit einem `schemaVersion` versehen. Beim Laden werden sie durch einen zentralen Runner (`runLayoutSchemaMigrations`) geführt. Dieser

- aktualisiert Legacy-Dateien auf das aktuelle Schema,
- gibt Warnungen aus, sobald Migrationen angewendet werden oder Pfade fehlen,
- verweigert Layouts, deren Schema neuer ist als die implementierte Version.

Durch Tests (`tests/api-versioning.test.ts`) wird sichergestellt, dass Legacy-Layouts weiterhin eingelesen werden können und zukünftige Schemen defensiv abgelehnt werden.

## Entwicklung & Tests

- Abhängigkeiten installieren: `npm install`
- Tests ausführen: `npm test`

Die Tests bundlen über esbuild und führen alle `*.test.ts`-Dateien in `layout-editor/tests` aus.

## Weiterführende Dokumentation

- [`docs/api-migrations.md`](docs/api-migrations.md) – Richtlinien für API-Änderungen und Layout-Migrationen.
- [`layout-editor/docs/domain-configuration.md`](layout-editor/docs/domain-configuration.md) – Beschreibt Domain-Quellen, Toggle-Optionen und Sicherheitsmechanismen.
- [`layout-editor/docs/data-model-overview.md`](layout-editor/docs/data-model-overview.md) – Überblick über Layout-Entities, Persistenzmodelle und Beziehungen.
- [`layout-editor/docs/ui-performance.md`](layout-editor/docs/ui-performance.md) – Deep-Dive zu diffbasierten Komponenten, Render-Tuning und Export-Throttling.
- [`layout-editor/docs/persistence-errors.md`](layout-editor/docs/persistence-errors.md) – Fehlerleitfaden für Speicher- und Wiederherstellungsszenarien.
- [`layout-editor/docs/view-registry.md`](layout-editor/docs/view-registry.md) – Details zu Registry-Guards, Lebenszyklus und Konfliktvermeidung.
- [`layout-editor/docs/i18n.md`](layout-editor/docs/i18n.md) – Leitfaden für Übersetzungen, Fallback-Strategien und Pluralisierung.
- [`layout-editor/docs/tooling.md`](layout-editor/docs/tooling.md) – Übersicht über CLI-Helfer, Tests und Automatisierungen.

Fortgeschrittene Leser finden künftig im zentralen Wiki-Index eine kuratierte Sammlung sämtlicher Deep-Dives, sobald dieser veröffentlicht ist.

