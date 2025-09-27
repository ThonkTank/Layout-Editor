---
status: open
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

## Lösungsideen
- Accessibility-Guideline schreiben: Fokuspfad, Tastenkombinationen, Screenreader-Texte, Live-Regionen für Banner.
- Ergänzende UI-Tests definieren (z. B. Playwright oder Jest mit jsdom) für Keyboard-Interaktionen.
- Abstimmen mit `ui-accessibility-and-diagrams.md`, damit Diagramme & Texte konsistent bleiben.
- Nach Fertigstellung User-Wiki aktualisieren und hierher verlinkte Hinweise entfernen.
