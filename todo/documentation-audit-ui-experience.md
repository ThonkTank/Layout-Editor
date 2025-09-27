---
status: closed
priority: medium
area:
  - documentation
  - ui
owner: docs-team
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
- ✅ Abläufe für zentrale Interaktionen als Sequenz- oder Aktivitätsdiagramm dokumentieren und in den Modul-Readmes verankern.
- ✅ Tastenkürzel, Gesten und Barrierefreiheitsanforderungen im User-Wiki abgleichen und sicherstellen, dass technische Readmes auf die Soll-Prozesse verweisen.
- ✅ Performance-Guidelines mit konkreten Beispielen aus den UI-Modulen ergänzen und gegenseitig verlinken.
- ⚠️ Validieren, dass Tests die dokumentierten Workflows abdecken, und fehlende Szenarien als weitere To-Dos erfassen. Folgepunkt: [`ui-shortcut-coverage.md`](ui-shortcut-coverage.md).

## Ergebnis (2025-03-18)

- `src/ui/README.md`, `src/elements/README.md` und `src/presenters/README.md` enthalten nun Inventar-Tabellen, verlinken die Soll-Workflows des User-Wikis und visualisieren Drag-, Snapping- und Shortcut-Sequenzen über Mermaid-Diagramme.
- `docs/ui-performance.md` referenziert konkrete Implementierungen (`StageComponent`, `StageController`, `StructurePanelPresenter`, `LayoutEditorStore`) sowie vorhandene Tests; fehlende Shortcut-Tests wurden als eigenes To-Do erfasst.
- `docs/layout-library.md` dokumentiert die Verflechtung mit Header-Präsentern und verweist auf Tests (`persistence-errors.test.ts`, `api-versioning.test.ts`), damit Performance- und Fehlerpfade nachvollziehbar bleiben.
- Offene Restarbeit betrifft ausschließlich Shortcut-Testabdeckung, weshalb das Nachfolge-To-Do [`ui-shortcut-coverage.md`](ui-shortcut-coverage.md) angelegt wurde.
