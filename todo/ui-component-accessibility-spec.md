---
status: closed
priority: high
area:
  - documentation
  - accessibility
owner: unassigned
tags:
  - ui-components
  - keyboard
links:
  - docs/ui-components.md
  - layout-editor/src/ui/components/stage.ts
  - layout-editor/src/ui/components/structure-tree.ts
  - layout-editor/src/ui/components/editor-shell.ts
---

# UI-Komponenten – Accessibility-Spezifikation

## Originalkritik
- Die neue User-Wiki-Referenz benennt mehrere Komponenten mit fehlender Tastaturführung und Screenreader-Strategie.
- Bisher existiert kein verbindlicher Soll-Zustand für Fokusreihenfolge, ARIA-Rollen oder Keyboard-Shortcuts der Stage, Resizer und Strukturbaum.

## Kontext
- QA und Accessibility-Audits benötigen dokumentierte Regeln, um Interaktionen zu testen und Abweichungen zu melden.
- Ohne Vorgaben laufen zukünftige Implementierungen Gefahr, inkompatible oder nicht-barrierefreie Patterns einzuführen.
- Resizer besitzen zwar ARIA-Attribute, aber Fokusverhalten und Feedback bei Grenzen sind ungeregelt.

## Betroffene Module
- `docs/ui-components.md`
- `layout-editor/src/ui/components/stage.ts`
- `layout-editor/src/ui/components/structure-tree.ts`
- `layout-editor/src/ui/components/editor-shell.ts`
- Potenzielle Tests in `layout-editor/src/tests/`

## Abschlussnotiz (2024-05)
- Accessibility-Guideline dokumentiert in [`docs/ui-components.md`](../docs/ui-components.md#accessibility-richtlinie-stage-tree-shell) sowie den Komponenten-Seiten (`stage.md`, `structure-tree.md`, `editor-shell.md`).
- Ist-Analysen der Implementierung sind in den Komponenten-Seiten hinterlegt, damit Reviewer Abweichungen erkennen.
- `layout-editor/tests/README.md` enthält nun eine manuelle Tastatur- und Screenreader-Checkliste als Übergangslösung.
- Technische Readmes verlinken auf die neue Guideline; veraltete To-Do-Verweise wurden entfernt.
