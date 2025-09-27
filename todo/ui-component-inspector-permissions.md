---
status: open
priority: medium
area:
  - documentation
  - product
owner: unassigned
tags:
  - ui-components
  - inspector
links:
  - docs/ui-components.md
  - layout-editor/src/inspector-panel.ts
  - layout-editor/docs/data-model-overview.md
---

# Inspector-Panel – Rollen & Berechtigungen klären

## Originalkritik
- Das User-Wiki weist darauf hin, dass Read-only-Zustände und Rollentrennungen im Inspector nicht definiert sind.
- Produktentscheidungen zu Admin-/Viewer-Rollen wurden bisher nur mündlich kommuniziert und fehlen schriftlich.

## Kontext
- Ohne klare Spezifikation können Implementierungen versehentlich Schreibrechte für Nutzer gewähren, die nur lesen dürfen.
- QA benötigt eindeutige Regeln, um das Verhalten im Review zu validieren.
- Integrationen mit Fremdsystemen (z. B. Freigabeworkflows) hängen von verlässlichen Berechtigungsmodellen ab.

## Betroffene Module
- `layout-editor/src/inspector-panel.ts`
- `layout-editor/src/state/layout-editor-store.ts`
- User-Wiki (`docs/ui-components.md`)
- Mögliche Feature-Flags/Settings in `layout-editor/docs/tooling.md`

## Lösungsideen
- Rollenmodell festlegen (z. B. Viewer, Editor, Admin) und definieren, welche Felder editierbar bleiben.
- Read-only-Varianten der Eingabefelder in `inspector-panel.ts` entwerfen (Disabled-State, Tooltip mit Hinweis).
- Dokumentation im User-Wiki erweitern, sobald Konzept steht; To-Do danach entfernen.
- Ergänzende Regressionstests schreiben (Snapshot oder Interaktion), um Schreibversuche ohne Rechte abzufangen.
