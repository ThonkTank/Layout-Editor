# Layout Editor Plugin

Der Layout Editor ist ein eigenständiges Obsidian-Plugin zum Erstellen, Verwalten und Teilen visueller Layouts. Dieses Paket enthält den Plugin-Quellcode, Build- und Testwerkzeuge sowie begleitende Dokumentation.

## Paketüberblick

- [`manifest.json`](manifest.json) – Obsidian-Manifest, das auf das gebündelte Plugin verweist.
- [`package.json`](package.json) / [`package-lock.json`](package-lock.json) – Abhängigkeiten, Build-, Test- und Lint-Skripte.
- [`esbuild.config.mjs`](esbuild.config.mjs) – Build-Konfiguration für das Bundling nach `main.js`.
- [`tsconfig.json`](tsconfig.json) – TypeScript-Konfiguration für den Plugin-Code.
- [`main.js`](main.js) – Gebündeltes Plugin-Artefakt, das an Obsidian ausgeliefert wird.

## Zentrale Unterordner

- [`src/`](src/README.md) – TypeScript-Quellcode, modularisiert nach State, Presentern, UI-Komponenten und Utilities.
- [`docs/`](docs/README.md) – Benutzer- und Architekturhandbuch mit vertiefenden Kapiteln zu API, Datenmodell, Persistenz u. v. m.
- [`tests/`](tests) – Esbuild-basierte Test-Suite mit Fokus auf Store-, UI- und Persistenz-Verhalten.
- [`scripts/`](scripts) – Hilfsskripte zur lokalen Entwicklung (Build, Lint, Release).

Weitere technische Detailseiten findest du in den jeweiligen Ordner-Readmes. Eine Endnutzer-orientierte Übersicht liegt im Projektwurzelverzeichnis unter [`docs/`](../docs).

## Entwicklung, Tests & Tooling

- `npm install` – Installiert alle Build- und Test-Abhängigkeiten.
- `npm run build` – Bundelt das Plugin nach `main.js`.
- `npm run test` – Führt die Tests aus [`tests/run-tests.mjs`](tests/run-tests.mjs).
- Zusätzliche Tooling-Hinweise und Workflows beschreibt [`docs/tooling.md`](docs/tooling.md).

Weiterführende Konzepte, Workflows und Troubleshooting-Guides befinden sich in [`docs/README.md`](docs/README.md) und den dort verlinkten Detailartikeln.
