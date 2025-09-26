# Persistenz-Diagnostik für Seed-Layouts

## Überblick

Dieses Dokument beschreibt die neuen Debug-Hooks und Logformate, die beim automatischen Bereitstellen der Seed-Layouts greifen. Ziel ist es, Konflikte zwischen veralteten Vault-Strukturen und der aktuellen Layout-Bibliothek frühzeitig zu erkennen.

## Log-Events & Formate

Alle Ereignisse werden über `console.debug` (bzw. `console.warn` bei Konflikten oder Fehlern) unter dem Scope `"[LayoutEditor][SeedLayouts]"` ausgegeben und gleichzeitig an optionale Test-Hooks weitergereicht. Ereignisobjekte besitzen folgende Grundstruktur:

```ts
interface SeedLayoutDiagnosticsEventBase {
    domainSource: "builtin" | "vault";
    existingVaultFiles: Array<{
        basename: string;
        folder: string;
        path: string;
        createdAt: number;
        modifiedAt: number;
    }>;
}
```

Spezifische Events:

- `ensure-start` – enthält die aktuelle Domänenquelle sowie alle Seed-IDs, die geprüft werden.
- `seed-check` – markiert den Start einer Seed-Prüfung für eine konkrete ID.
- `seed-skipped` – Seed wird nicht erneut geschrieben, weil bereits eine Datei existiert (`reason: "already-exists"`).
- `seed-created` – Seed wurde neu gespeichert; das Ereignis enthält die aktualisierte Dateiliste.
- `seed-error` – Fehler in den Phasen `"check"` (Lesen vorhandener Seeds) oder `"save"` (Schreiben).
- `legacy-conflict` – es existieren mehrere Dateien mit derselben Basis-ID in unterschiedlichen Kandidatenordnern (`LayoutEditor/Layouts` vs. `Layout Editor/Layouts`).

### Beispielausgabe

```json
{
  "type": "legacy-conflict",
  "domainSource": "builtin",
  "seedId": "layout-editor-default",
  "existingVaultFiles": [
    {
      "basename": "layout-editor-default",
      "folder": "LayoutEditor/Layouts",
      "path": "LayoutEditor/Layouts/layout-editor-default.json",
      "createdAt": 1690000000000,
      "modifiedAt": 1690050000000
    },
    {
      "basename": "layout-editor-default",
      "folder": "Layout Editor/Layouts",
      "path": "Layout Editor/Layouts/layout-editor-default.json",
      "createdAt": 1689900000000,
      "modifiedAt": 1689950000000
    }
  ],
  "conflictingFiles": [
    { "folder": "LayoutEditor/Layouts", "path": "LayoutEditor/Layouts/layout-editor-default.json", "basename": "layout-editor-default" },
    { "folder": "Layout Editor/Layouts", "path": "Layout Editor/Layouts/layout-editor-default.json", "basename": "layout-editor-default" }
  ]
}
```

## Hooks für Tests & Tools

Über `setSeedLayoutDiagnosticsHook(handler)` lässt sich ein Listener registrieren, der jedes Ereignis empfängt, bevor es in die Konsole geschrieben wird. Dies ermöglicht:

- unit- und integrationstestspezifische Assertions,
- Telemetrie-Erweiterungen in Entwicklungs-Builds,
- automatisierte Konflikt-Reports in CI-Läufen.

Ein `null`-Handler deaktiviert die Weiterleitung wieder. Die Funktion befindet sich in `layout-editor/src/seed-layouts.ts`.

## Empfohlene Vault-Prüfungen

1. **Ordner-Übersicht erstellen** – Nutze `listLayoutVaultFiles(app)` aus `layout-editor/src/layout-library.ts`, um alle Layout-Dateien mit Zeitstempeln zu inspizieren.
2. **Konflikte auflösen** – Reagiere auf `legacy-conflict`-Events, indem du doppelte Dateien aus `Layout Editor/Layouts` in den aktuellen Ordner migrierst oder entfernst.
3. **Schema-Version prüfen** – Wenn `seed-error`-Events beim Lesen auftreten, prüfe die JSON-Struktur auf gültige `schemaVersion`-Werte und konsistente Elementlisten.
4. **Re-Seeding erzwingen** – Entferne problematische Dateien und starte den Seed-Prozess erneut (z. B. Plugin neuladen), um saubere Seeds zu erzeugen.

## Weiterführende Dokumentation

- [`layout-library.md`](../layout-editor/docs/layout-library.md) – Aufbau der Layout-Bibliothek, Speicherorte und Schema-Migrationen.
- [`persistence-errors.md`](../layout-editor/docs/persistence-errors.md) – Mapping von Fehlercodes zu Benutzerhinweisen.
