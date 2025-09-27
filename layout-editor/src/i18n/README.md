# Internationalisation

The localisation layer bundles all human-facing strings for the layout editor and provides helpers to clone and extend the default German translations.

> **To-Do:** [Audit der Persistenz-, Konfigurations- & i18n-Dokumentation](../../../todo/persistence-config-i18n-doc-audit.md)

## Files

- `strings.ts` – Declares the locale schema, exposes `createLayoutEditorStrings` for deep-merging overrides, and implements formatting helpers such as `formatLayoutString`.

## Conventions & Extension Points

- Always request a fresh bundle via `createLayoutEditorStrings()` when rendering UI. The helper returns a clone so downstream mutations stay isolated.
- Add new string groups as optional deep partials, keeping backwards compatibility for overrides. Document feature-level terminology or override instructions in the [i18n guide](../../docs/i18n.md).
- Prefer placeholder-based templates (e.g. `{child}`) combined with `formatLayoutString` instead of manual concatenation to keep translations flexible.
