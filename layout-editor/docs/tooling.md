# Tooling

This project relies on shared linting, formatting, and test tooling to keep contributions consistent and verifiable. The commands below run locally and in CI.

## Linting

- `npm run lint` – Runs ESLint with the TypeScript ruleset against the source, scripts, and test directories. The command fails on any lint error or warning.
- `npm run lint -- --fix` or `npm run lint:fix` – Applies automatic fixes for supported rules.

## Formatting

- `npm run format` – Checks that files adhere to the configured Prettier formatting rules.
- `npm run format:fix` – Rewrites the same set of files using Prettier defaults.

## Tests

- `npm test` – Builds each `*.test.ts` file under `tests/` with esbuild and executes them with Node.js. The runner fails fast on the first error and reports overall progress.

Add new test files under `tests/` using the `*.test.ts` naming convention to have them discovered automatically.

## Navigation

- [Documentation index](./README.md)
- Related: [Plugin API](./plugin-api.md)

## Offene Aufgaben

Derzeit keine. Ergänze hier einen Verweis, sobald im [`../../todo/`](../../todo/) Ordner neue Maßnahmen für das Tooling dokumentiert werden.
