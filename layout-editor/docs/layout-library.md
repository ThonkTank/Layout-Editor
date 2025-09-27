# Layout-Bibliothek

Die Layout-Bibliothek kapselt das Speichern und Laden von Layout-Dateien im Obsidian-Vault. Dieses Dokument beschreibt die Ordnerstruktur, ID- und Schema-Regeln sowie die Fehlerbehandlung des Moduls `src/layout-library.ts`.

## Vault-Pfade und Legacy-Verzeichnisse

- **Aktueller Speicherort:** Layouts werden standardmäßig unter `LayoutEditor/Layouts` abgelegt. Das Modul legt fehlende Ordner automatisch an, indem es die Segmente nacheinander erzeugt.【F:layout-editor/src/layout-library.ts†L28-L131】
- **Legacy-Pfade:** Beim Lesen werden zusätzlich ältere Verzeichnisnamen wie `Layout Editor/Layouts` durchsucht. Dateien aus Legacy-Pfaden werden erkannt, ohne dass sie sofort migriert werden müssen.【F:layout-editor/src/layout-library.ts†L28-L157】
- **Dateisuche:** Beim Auflisten oder Laden prüft die Bibliothek alle bekannten Ordner, filtert JSON-Dateien und ignoriert doppelte Basenamen, damit eine Layout-ID nur einmal auftaucht.【F:layout-editor/src/layout-library.ts†L133-L158】

## Dateinamen, IDs und Namensgebung

- **Dateinamen:** Jede Layout-Datei trägt die Form `<id>.json`. Die ID ist damit der primäre Schlüssel im Vault.【F:layout-editor/src/layout-library.ts†L160-L200】
- **ID-Erzeugung:** Fehlt eine ID, erzeugt `createId` eine UUID oder einen Fallback-Wert auf Basis von Zufallsanteilen und Timestamp.【F:layout-editor/src/layout-library.ts†L168-L175】
- **ID-Regeln:** Benutzerdefinierte IDs werden durch `resolveLayoutId` geprüft. Leere Werte oder reine Platzhalter (`"."`, `".."`) werden ersetzt, Pfadtrenner (`/`, `\`) führen zu einem Fehler. Dadurch werden Vault-Pfade geschützt.【F:layout-editor/src/layout-library.ts†L176-L191】
- **Layout-Namen:** `sanitizeName` setzt leere Namen auf „Unbenanntes Layout“, sodass UI-Komponenten immer einen Titel anzeigen können.【F:layout-editor/src/layout-library.ts†L164-L166】

## Schema-Versionierung und Migrationen

- **Versionierung:** Gespeicherte Layouts enthalten das Feld `schemaVersion`. Aktuell unterstützt die Bibliothek Version 1 und akzeptiert Daten bis zur Mindestversion 0.【F:layout-editor/src/layout-library.ts†L5-L26】
- **Migrations-Runner:** `runLayoutSchemaMigrations` normalisiert eingehende Versionen und führt sie sequentiell durch alle Migrationsschritte. Layouts mit höherer Version als die Runtime werden verworfen, ebenso Layouts, für die eine Migration fehlt oder die Version nicht voranschreitet.【F:layout-editor/src/layout-library.ts†L71-L104】
- **Unterstützungsgrenzen:** Nach den Migrationen prüft der Runner, ob die finale Version mindestens `MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION` erreicht. Ältere Layouts werden mit Warnung verworfen.【F:layout-editor/src/layout-library.ts†L106-L113】
- **Migrationen:** Die derzeitige Migration aktualisiert Schema `0` zu `1` und konvertiert die `attributes`-Eigenschaft zu Arrays, falls sie zuvor in anderer Form gespeichert wurde.【F:layout-editor/src/layout-library.ts†L14-L26】

## Speichervorgang (`saveLayoutToLibrary`)

Beim Speichern aggregiert das Modul alle Validierungen, bevor die Datei geschrieben wird.【F:layout-editor/src/layout-library.ts†L193-L225】 Wichtige Fehlerfälle:

1. **Ungültige IDs:** Pfadtrenner oder Sonder-IDs lösen Exceptions aus `resolveLayoutId` aus.【F:layout-editor/src/layout-library.ts†L176-L191】
2. **Canvas-Größen:** Breite und Höhe müssen positive, endliche Zahlen sein. Ungültige Werte erzeugen Fehler wie „Ungültige Breite für das Layout.“.【F:layout-editor/src/layout-library.ts†L205-L233】
3. **Elementvalidierung:** Layouts ohne Elemente oder mit fehlerhaften Element-Eigenschaften werden abgelehnt. Die strenge Prüfung stellt sicher, dass keine unvollständigen Elemente im Vault landen.【F:layout-editor/src/layout-library.ts†L270-L326】
4. **Vault-Zugriff:** `app.vault.create` bzw. `modify` können Obsidian-eigene Fehler werfen (z. B. fehlende Rechte). Diese werden unverändert propagiert, damit UI-Schichten entscheiden können, wie sie reagieren.【F:layout-editor/src/layout-library.ts†L218-L223】

Bei Erfolg werden Metadaten wie `createdAt`, `updatedAt` und `schemaVersion` gesetzt, sodass Folgeaufrufe konsistente Daten lesen können.【F:layout-editor/src/layout-library.ts†L204-L217】

## Laden und Lesen

- **Metadaten lesen:** `readLayoutMeta` analysiert jede JSON-Datei, verwirft invalide Dimensionen und Elemente und führt anschließend die Schema-Migrationen aus. Fehler beim Lesen werden protokolliert, das Layout wird dann übersprungen.【F:layout-editor/src/layout-library.ts†L340-L374】
- **Listen & Einzelabruf:** `listSavedLayouts` und `loadSavedLayout` stellen sicher, dass der Zielordner existiert, bevor Dateien eingelesen werden.【F:layout-editor/src/layout-library.ts†L377-L395】

## Fehlerbilder und UI-Reaktionen

### `saveLayoutToLibrary`

- **Banner & Notices:** Fehler propagieren bis zur Kopfzeile des Editors. `describeLayoutPersistenceError` ordnet bekannte Meldungen den UI-Codes `layout/...` zu, ergänzt Hilfetexte und zeigt sie sowohl im Persistenz-Banner als auch in einem Obsidian-Notice an.【F:layout-editor/src/presenters/header-controls.ts†L40-L145】【F:layout-editor/src/presenters/header-controls.ts†L400-L426】
- **Banner-Lifecycle:** `showPersistenceError` initialisiert bei Bedarf den `StatusBannerComponent` und aktualisiert seinen Zustand, bis ein erfolgreicher Speichervorgang `clearPersistenceError` aufruft.【F:layout-editor/src/presenters/header-controls.ts†L446-L461】

### `runLayoutSchemaMigrations`

- **Verworfenes Layout:** Gibt die Funktion `null` zurück (z. B. wegen fehlender Migration oder zukünftiger Version), blendet die Layout-Auswahl im UI den Eintrag einfach nicht ein. Beim manuellen Import zeigt die Kopfzeile ein Notice „Layout konnte nicht geladen werden“.【F:layout-editor/src/layout-library.ts†L71-L113】【F:layout-editor/src/presenters/header-controls.ts†L364-L381】
- **Warnmeldungen:** Der Runner akzeptiert eine `warn`-Funktion (Default: `console.warn`), sodass Migrationen Hinweise in der Konsole hinterlassen können. UI-Komponenten können alternative Logger einspeisen, wenn feinere Kommunikation nötig ist.【F:layout-editor/src/layout-library.ts†L71-L113】

## Weiterführende Dokumente

- [Dokumentenindex](./README.md)
- [`docs/persistence-errors.md`](./persistence-errors.md) – Detailbeschreibung des Persistenz-Banners und Fehlercodes.
- [`docs/domain-configuration.md`](./domain-configuration.md) – Erläutert, wie Seed-Layouts in die Bibliothek synchronisiert werden.
