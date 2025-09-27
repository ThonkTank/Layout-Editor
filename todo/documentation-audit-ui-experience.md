---
status: open
priority: medium
area:
  - documentation
  - ui
owner: unassigned
tags:
  - presenters
  - interaction-design
links:
  - layout-editor/src/ui/README.md
  - layout-editor/src/elements/README.md
  - layout-editor/src/presenters/README.md
  - layout-editor/docs/ui-performance.md
---

# UI- und Interaktionsdokumentation konsolidieren

## Originalkritik
- Die UI-Readmes listen Komponenten und Presenter, dokumentieren aber nicht durchgängig die Interaktions-Workflows (Drag & Drop, Snapping, Tastenkürzel). Zwischen UI-Performance-Guidelines und Element-Dokumentation fehlen Querverweise.

## Kontext
- Neue Komponenten und Refactorings werden ohne klare Dokumentationsbasis risikoreich. Reviewer und Integratoren benötigen nachvollziehbare Abläufe und erwartete Nutzerinteraktionen.
- Das User-Wiki beschreibt die Soll-Workflows, verweist jedoch nicht immer zurück auf technische Details der Module.

## Betroffene Module
- `layout-editor/src/ui/README.md`
- `layout-editor/src/elements/README.md`
- `layout-editor/src/presenters/README.md`
- `layout-editor/docs/ui-performance.md`
- `layout-editor/docs/layout-library.md`

## Lösungsideen
- Abläufe für zentrale Interaktionen als Sequenz- oder Aktivitätsdiagramm dokumentieren und in den Modul-Readmes verankern.
- Tastenkürzel, Gesten und Barrierefreiheitsanforderungen im User-Wiki abgleichen und sicherstellen, dass technische Readmes auf die Soll-Prozesse verweisen.
- Performance-Guidelines mit konkreten Beispielen aus den UI-Modulen ergänzen und gegenseitig verlinken.
- Validieren, dass Tests die dokumentierten Workflows abdecken, und fehlende Szenarien als weitere To-Dos erfassen.
