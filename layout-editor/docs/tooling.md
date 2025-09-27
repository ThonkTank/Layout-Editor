# Tooling

This project relies on shared linting, formatting, and test tooling to keep contributions consistent and verifiable. The commands below run locally and in CI.

## Setup-Workflow

1. **Abhängigkeiten installieren:** `npm install` im Verzeichnis `layout-editor/` ausführen. Das erzeugt `node_modules/` und synchronisiert `package-lock.json`.
2. **Node-Version prüfen:** Verwende die in der Entwicklungsumgebung definierte LTS-Version (fehlende Projektangabe – siehe [`onboarding-runtime-compatibility.md`](../todo/onboarding-runtime-compatibility.md)).
3. **Erstlauf:** `npm run lint && npm test` einmalig starten, um sicherzustellen, dass ESLint-Cache und Test-Runner korrekt initialisiert sind.
4. **CI-Spiegelung:** Vor Pull Requests immer `npm run lint`, `npm run format`, `npm test` und `npm run build` ausführen; sie entsprechen den GitHub-Actions.
5. **Artefakte räumen:** Bei widersprüchlichen Ergebnissen `rm -rf dist/` und `npm run build` aufrufen, um den bundelten Zustand zu aktualisieren.

## Linting

- `npm run lint` – Runs ESLint with the TypeScript ruleset against the source, scripts, and test directories. The command fails on any lint error or warning.
- `npm run lint -- --fix` or `npm run lint:fix` – Applies automatic fixes for supported rules.

## Formatting

- `npm run format` – Checks that files adhere to the configured Prettier formatting rules.
- `npm run format:fix` – Rewrites the same set of files using Prettier defaults.

## Tests

- `npm test` – Builds each `*.test.ts` file under `tests/` with esbuild and executes them with Node.js. The runner fails fast on the first error and reports overall progress.

Add new test files under `tests/` using the `*.test.ts` naming convention to have them discovered automatically.

## Versionierung & CI-Kontext

- Tooling-Updates folgen semantischer Versionierung in [`docs/api-migrations.md`](../../docs/api-migrations.md); Breaking Changes müssen dort referenziert werden.
- ESLint-, Prettier- und TypeScript-Versionen werden über `package.json` gepflegt. Prüfe bei Upgrades die Release-Notes und dokumentiere Auswirkungen im User-Wiki.
- CI nutzt dieselben Skripte; stelle sicher, dass neue Befehle (`npm run <...>`) in `package.json` definiert und hier dokumentiert werden.

## Fehlerdiagnose

- **Linting schlägt fehl:** Mit `npm run lint -- --debug` ausführlichere Logs aktivieren und problematische Dateien anhand der Regel-ID korrigieren.
- **Format-Checks:** `npm run format -- --loglevel debug` zeigt überschrittene Dateiliste an. Nutze `npm run format:fix` und kontrolliere die Änderungen über Git-Diff.
- **Tests brechen ab:** `node scripts/run-tests.mjs --watch` zur Reproduktion mit Hot-Reload nutzen. Persistente Fehler gegen [`docs/persistence-errors.md`](./persistence-errors.md) oder das User-Wiki (`../../docs/persistence-diagnostics.md`) gegenprüfen.
- **Build-Probleme:** `npm run build -- --log-level=debug` zeigt Esbuild-Details. Prüfe zusätzlich `scripts/generate-component-manifest.mjs` bei Schemaänderungen.

## Navigation

- [Documentation index](./README.md)
- User-Wiki: [`docs/README.md`](../../docs/README.md#verwandte-deep-dives-in-layout-editordocs)
- Related: [Plugin API](./plugin-api.md)

## Offene Aufgaben

- Integrationsdokumentation inkl. Tooling-Anforderungen prüfen: [`documentation-audit-integration-api.md`](../todo/documentation-audit-integration-api.md).
