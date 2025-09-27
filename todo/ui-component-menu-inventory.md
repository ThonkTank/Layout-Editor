---
status: open
priority: medium
area:
  - documentation
  - ux
owner: unassigned
tags:
  - ui-components
  - menus
links:
  - docs/ui-components.md
  - layout-editor/src/ui/editor-menu.ts
  - layout-editor/src/elements/registry.ts
---

# Kontextmenüs – Inventur & Trigger-Dokumentation

## Originalkritik
- Im User-Wiki fehlen konkrete Listen, welche Kontextmenüs existieren und wodurch sie geöffnet werden.
- Entwickler:innen müssen aktuell den Code durchsuchen, um Menüeinträge zu finden; das erschwert Reviews und Onboarding.

## Kontext
- Neue Komponenten sollen konsistente Menüs erhalten; ohne Inventur droht Duplizierung oder widersprüchliche Bezeichnungen.
- QA benötigt eine Referenz, um fehlende oder fehlerhafte Menüeinträge zu erkennen.
- Lokalisierungsteams brauchen Überblick, um Strings zu priorisieren (`layout-editor/docs/i18n.md`).

## Betroffene Module
- `layout-editor/src/ui/editor-menu.ts`
- `layout-editor/src/elements/`
- User-Wiki (`docs/ui-components.md`)
- Tests in `layout-editor/src/tests/`

## Lösungsideen
- Vollständige Liste aller Menü-Triggers (Buttons, Kontextaktionen, Tastaturkürzel) erstellen.
- Menüeinträge kategorisieren (Layout-Manipulation, Export, History etc.) und im User-Wiki dokumentieren.
- Prüfen, ob dedizierte Tests für Menü-Inhalte sinnvoll sind (Snapshot/Contract-Test).
- Nach Pflege Inventur im User-Wiki verlinken und dieses To-Do schließen.
