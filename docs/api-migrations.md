# API- und Layout-Migrationen

Dieses Dokument beschreibt die Versionierungsstrategie des Layout-Editor-Plugins sowie den Workflow zum Einführen neuer API- oder Schema-Änderungen.

## Plugin-API-Versionierung

- Die exportierte Konstante `LAYOUT_EDITOR_API_VERSION` gibt die aktuell ausgelieferte API-Version an (SemVer).
- `LayoutEditorPlugin.getApi()` liefert ein Objekt mit:
  - `apiVersion`
  - `isApiVersionAtLeast(version: string)`
  - `assertApiVersion(version: string, featureName?: string)`
  - `withMinimumApiVersion(version: string, feature: () => T)`
- Verwende `withMinimumApiVersion`, um neue Funktionen nur dann auszuführen, wenn Konsumenten das erforderliche API-Level unterstützen.
- `assertApiVersion` ist für harte Anforderungen gedacht (z. B. wenn ein Feature ohne das neue API-Level nicht funktionieren kann).
- Bei Breaking Changes muss mindestens die Minor-Version erhöht werden. Dokumentiere das Verhalten im Changelog und aktualisiere Beispiele in README & Tests.

### Workflow für API-Änderungen

1. **Planung** – Definiere, welche Methoden/Signaturen geändert werden und welches minimale API-Level benötigt wird.
2. **Implementation** – Implementiere die Funktionalität hinter einem Versions-Gate mittels `withMinimumApiVersion` oder `assertApiVersion`.
3. **Dokumentation** – Aktualisiere README und ggf. Inline-Kommentare.
4. **Tests** – Erweitere `tests/api-versioning.test.ts`, um neue Versionen und Fehlerszenarien abzudecken.

## Layout-Schema-Versionierung

Jede gespeicherte Layout-Datei enthält das Feld `schemaVersion`. Die Bibliothek definiert:

- `LAYOUT_SCHEMA_VERSION`: aktuell unterstützte Zielversion.
- `MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION`: ältestes unterstütztes Schema, das migriert werden kann.
- `runLayoutSchemaMigrations(layout, warn?)`: zentraler Runner, der Legacy-Dateien iterativ anhebt.

Beim Laden eines Layouts:

1. Das JSON wird normalisiert (Pflichtfelder, Fallbacks).
2. `schemaVersion` wird ermittelt, fehlende Werte werden als `0` interpretiert.
3. `runLayoutSchemaMigrations` führt definierte Migrationen aus und gibt Warnungen aus:
   - wenn Migrationen angewendet werden,
   - wenn Pfade fehlen oder keine höhere Version erreicht wird,
   - wenn das Layout ein zukünftiges Schema nutzt (Layout wird verworfen).

### Migrationen hinzufügen

1. **Neue Version wählen** – Erhöhe `LAYOUT_SCHEMA_VERSION` um mindestens `+1`.
2. **Migration implementieren** – Ergänze `LAYOUT_SCHEMA_MIGRATIONS` um eine Funktion für den Übergang von `n` → `n+1`.
3. **Daten anpassen** – Passe innerhalb der Migration alle Schemaänderungen an und setze `schemaVersion` auf die neue Zielversion.
4. **Warnungen prüfen** – Stelle sicher, dass die Migration bei Erfolg den Hinweis „migriert“ ausgibt und im Fehlerfall eine aussagekräftige Warnung erzeugt.
5. **Tests erweitern** – Ergänze `tests/api-versioning.test.ts` (oder eigene Tests), um Legacy-Layouts gegen die neue Migration zu prüfen.
6. **Dokumentation aktualisieren** – Beschreibe das neue Schema sowie erforderliche Konsument:innen-Anpassungen im README oder ergänzenden Dokumenten.

### Fehlende Migrationen

Wenn ein Layout eine ältere Version besitzt, für die keine Migration definiert ist, verwirft `runLayoutSchemaMigrations` die Datei und erzeugt eine Warnung. Dies signalisiert, dass eine Migration nachgerüstet werden muss, bevor das Layout wieder geladen werden kann.

### Zukünftige Schemen

Layouts mit einer höheren `schemaVersion` als `LAYOUT_SCHEMA_VERSION` gelten als inkompatibel. Sie werden nicht geladen, damit keine fehlerhaften Daten verarbeitet werden. Ein entsprechender Warnhinweis wird ausgegeben.

## Store-Snapshot-Verhalten

- `LayoutEditorStore.getState()` sowie `state`-Events geben nur noch tief geklonte Snapshots zurück. Änderungen an den gelieferten Objekten haben keine Seiteneffekte mehr.
- UI-Schichten müssen Layout-Anpassungen deshalb über Befehle wie `moveElement`, `resizeElement`, `offsetChildren` oder `applyElementSnapshot` zurück an den Store delegieren.
- Undo/Redo bleibt deterministisch, weil die History ausschließlich mit Store-internen Snapshots arbeitet; externe Mutationen gehen verloren, bis sie über die genannten Befehle gemeldet werden.

## Tests & Qualitätssicherung

- `tests/api-versioning.test.ts` enthält Regressionstests für API-Helfer und Migrationen.
- Ergänze neue Tests bei jeder Änderung an API oder Schema.

## Best Practices

- Vermeide breaking Changes ohne Versionssprung.
- Halte Migrationen idempotent und funktional (keine Seiteneffekte außerhalb des Layout-Objekts).
- Protokolliere Warnungen so, dass Vault-Pfad und Layout-ID nachvollziehbar bleiben.
- Entferne alte Migrationen erst, wenn die entsprechenden Schemen offiziell nicht mehr unterstützt werden.

## Navigation

- [Zurück zum Docs-Index](README.md)
- Deep-Dive-Referenzen:
  - [Plugin-API-Referenz](../layout-editor/docs/plugin-api.md)
  - [Layout-Bibliothek & Persistenz](../layout-editor/docs/layout-library.md)
  - [Datenmodell-Überblick](../layout-editor/docs/data-model-overview.md)

