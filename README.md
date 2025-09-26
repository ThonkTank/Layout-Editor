# Layout-Editor

Der Layout-Editor ist ein Obsidian-Plugin zum Entwerfen komplexer Formular- und Dashboard-Layouts, die von anderen Plugins wiederverwendet werden können. Der Editor stellt eine Canvas-Ansicht, Element-Bibliotheken sowie eine Persistenzschicht für Layout-Dateien bereit.

## Kernfunktionen

- **Interaktive Editor-Ansicht** – Öffne den Layout-Editor als eigene Obsidian-View mit Canvas, Strukturbaum und Inspector, um Layouts visuell zu modellieren.
- **Erweiterbare Elementbibliothek** – Registriere eigene UI-Komponenten und View-Bindings über die öffentliche Plugin-API.
- **Layout-Bibliothek** – Speichere Layouts im Vault, lade sie erneut oder teile sie mit anderen Plugins.
- **Versionierte Plugin-API** – `apiVersion` kennzeichnet das veröffentlichte API-Level, Helfer wie `isApiVersionAtLeast` und `withMinimumApiVersion` erlauben defensive Feature-Gates.
- **Schema-Migrationen** – Gespeicherte Layouts enthalten ein `schemaVersion`-Feld. Die Bibliothek führt Migrationen zentral aus und warnt bei fehlenden Pfaden oder zukünftigen Versionen.

## Nutzung & Workflows

1. **Editor öffnen**: Über das Ribbon-Icon oder den Befehl „Layout Editor öffnen“ wird die dedizierte View aktiviert.
2. **Layouts modellieren**: Elemente aus der Bibliothek auf die Arbeitsfläche ziehen, Eigenschaften im Inspector anpassen und optional View-Bindings zuweisen.
3. **Layout speichern**: Über die Speicher-Controls wird ein Layout unter einer ID im Vault abgelegt. Bestehende Einträge werden migrationssicher überschrieben.
4. **Layouts laden/teilen**: Plugins können via API Layouts laden und mit `schemaVersion`-Checks gegen das aktuelle Schema absichern.

## Öffentliche API & Versionierung

- Jede Instanz von `LayoutEditorPlugin.getApi()` liefert ein Objekt mit `apiVersion` sowie den Helfern `isApiVersionAtLeast`, `assertApiVersion` und `withMinimumApiVersion`.
- Neue Features werden hinter Versionsprüfungen freigeschaltet. Konsumenten können so optional auf neue Funktionen reagieren, ohne ältere Plugin-Versionen zu brechen.
- Die aktuell ausgelieferte API-Version lautet `1.0.0`.

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

