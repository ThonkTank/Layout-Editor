# Skripte

Die Skripte automatisieren Build-, Test- und Generierungsaufgaben für den Layout-Editor. Sie laufen als Node-ESM-Module und können direkt über `node` oder npm-Skripte gestartet werden.

## Inhalte
- [`generate-component-manifest.mjs`](generate-component-manifest.mjs) – Erstellt `src/elements/component-manifest.ts` aus allen registrierten Komponenten.
- [`run-tests.mjs`](run-tests.mjs) – Bündelt sämtliche `tests/**/*.test.ts`-Dateien mit esbuild und führt sie sequenziell aus. Verwendet dieselbe Pipeline wie `npm test`.

## Konventionen
- **ESM-Only**: Skripte sind reine ES-Module. Verwende `import`/`export` und `fileURLToPath` für Pfadauflösungen.
- **Nebenwirkungsfrei**: Skripte sollen keine Layout-Dateien mutieren. Outputs gehören in `src/elements/component-manifest.ts` oder `node_modules/.cache/layout-editor-tests`.
- **CLI-Usage**: Parameter werden über Umgebungsvariablen oder Commander-Wrapper in nachgelagerten Aufgaben ergänzt. Beim Erweitern zuerst prüfen, ob [`../docs/tooling.md`](../docs/tooling.md) bestehende Flags beschreibt.
- **Pfad-Konventionen**: Root über `resolve(__dirname, "..")` ermitteln; neue Skripte folgen diesem Muster, damit sie unabhängig vom Aufrufort funktionieren.

## Weiterführende Dokumentation
- Tooling-Überblick & Befehle: [`../docs/tooling.md`](../docs/tooling.md)
- Modul-Architektur und Ownership: [`../src/README.md`](../src/README.md)
- Bekannte Architektur-Lücken (Store/History): [`../../todo/layout-store-consistency.md`](../../todo/layout-store-consistency.md)
- Projektweite Nutzung & Workflows: [`../../README.md`](../../README.md)
