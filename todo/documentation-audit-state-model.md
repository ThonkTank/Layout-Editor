---
status: closed
priority: high
area:
  - documentation
  - state
owner: unassigned
tags:
  - layout-editor-core
  - data-model
links:
  - layout-editor/src/state/README.md
  - layout-editor/src/model/README.md
  - layout-editor/docs/data-model-overview.md
---

# State- und Datenmodell-Dokumentation verifizieren

## Originalkritik
- Die bestehenden Readmes zum State-Layer und zum Datenmodell verweisen aufeinander, enthalten jedoch unterschiedliche Details zu Snapshot-Verträgen, Serialisierung und Schema-Evolution. Es ist unklar, ob alle aktuell implementierten Flows (History, Export, Telemetrie) vollständig dokumentiert sind und konsistente Begrifflichkeiten verwenden.

## Kontext
- Der Layout-Editor lehnt sich stark an das zentrale Store- und Modellkonzept an. Fehlerhafte oder lückenhafte Dokumentation führt zu Missverständnissen bei Integratoren und gefährdet die Wartbarkeit der Kernfunktionen.
- Insbesondere neuere Funktionen wie differenzbasierte Patches, elementare Constraint-Validierungen und Telemetrie-Hooks benötigen einen Soll-Zustand im Wiki, damit Tests und Architekturentscheidungen nachvollziehbar bleiben.

## Betroffene Module
- `layout-editor/src/state/README.md`
- `layout-editor/src/model/README.md`
- `layout-editor/docs/data-model-overview.md`
- `layout-editor/docs/history-design.md`

## Lösungsideen
- Soll-Ist-Abgleich für alle State-APIs und Datenstrukturen erstellen und fehlende Abschnitte in den Readmes bzw. im User-Wiki ergänzen.
- Begrifflichkeiten (z. B. *LayoutSnapshot*, *Patch*, *HistoryFrame*) vereinheitlichen und mit Glossar-Abschnitt verlinken.
- Dokumentationslücken mit konkreten Aufgaben nachziehen (z. B. fehlende Sequenzdiagramme, unbeschriebene Edge-Cases) und anschließend Tests referenzieren.
- Ergebnis im User-Wiki zusammenfassen und dort auf die detaillierten Modul-Dokumente verweisen.

## Ergebnis (2025-09-27)

- `layout-editor/src/state/README.md`, `layout-editor/src/model/README.md`, `layout-editor/docs/data-model-overview.md` und `layout-editor/docs/history-design.md` enthalten jetzt Glossar-, Sequenz- und Edge-Case-Abschnitte inkl. Testreferenzen.
- Das User-Wiki beschreibt den Soll-Zustand in [`docs/layout-editor-state-history.md`](../docs/layout-editor-state-history.md) und verlinkt zurück in die technischen Guides.
- Verweise auf dieses To-Do wurden aus den Modul-Dokumenten entfernt; offene Aufgaben verbleiben ausschließlich in den verbleibenden Audit-Dateien.
