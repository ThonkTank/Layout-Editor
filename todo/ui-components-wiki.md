---
status: open
priority: high
area:
  - documentation
  - user-wiki
owner: unassigned
tags:
  - ui-components
  - wiki
links:
  - layout-editor/src/ui/components/README.md
  - docs/README.md
---

# UI-Komponenten-Wiki vervollständigen

## Originalkritik
- Das User-Wiki beschreibt die Layout-Bearbeitung nur auf hoher Ebene; eine vollständige Referenz für die einzelnen UI-Komponenten fehlt.
- Auf der Arbeitsfläche verfügbare Elemente (Stage, Strukturbaum, Inspector-Bausteine, Banner usw.) besitzen keine eigenen Wiki-Einträge.
- Entwickler finden derzeit keine einheitliche Quelle, die Eigenschaften, Zustände und Interaktionsmuster pro Komponente festhält.

## Kontext
- Das User-Wiki dient als verbindliche Soll-Dokumentation für Workflows und Komponenten. Ohne dedizierte Einträge entsteht Wissensverlust bei Onboarding, QA und Erweiterungen.
- Neue Komponenten oder Refactorings laufen Gefahr, inkonsistente Bedienmuster zu schaffen, wenn ihre Anforderungen nicht dokumentiert sind.
- Reviewer benötigen nachvollziehbare Referenzen, um UI-Änderungen gegen definierte Erwartungen zu prüfen.

## Betroffene Module
- `layout-editor/src/ui/components/` (alle UI-Komponenten)
- `layout-editor/src/ui/README.md`
- `docs/README.md`
- User-Wiki (Ordner TBD – muss identifiziert und mit Referenzen ergänzt werden)

## Lösungsideen
- Vollständige Liste aller im Editor verfügbaren UI-Komponenten zusammentragen (Canvas-Elemente, Inspector, Strukturbaum, Banner, Kontextmenüs usw.).
- Pro Komponente einen Wiki-Eintrag planen: Zweck, Interaktionen, Zustände, Abhängigkeiten, Barrierefreiheitsnotizen und Links zu technischen Readmes.
- Informationsarchitektur definieren (Navigationsstruktur, Querverweise zwischen Komponenten, Zuordnung zu Workflows im User-Wiki).
- Abgleich mit technischen Dokumenten (`layout-editor/src/ui/components/README.md`, Tests, Performance-Guides), um konsistente Begriffe und Verantwortlichkeiten festzulegen.
- Review-Checkliste entwerfen, damit künftige Komponenten denselben Dokumentationsstandard erfüllen.
