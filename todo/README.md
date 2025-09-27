# Offene Aufgaben

Dieses Verzeichnis sammelt alle offenen To-Dos für den Layout-Editor. Jede Datei beschreibt ein konkretes Thema mit Kontext, betroffenen Modulen und Lösungsideen. Sobald ein To-Do erledigt ist, wird es hier entfernt oder archiviert.

## Strukturdiagramm

- `README.md` – Index des Backlogs, beschreibt Struktur, Konventionen und Metadaten-Standard.
- `store-snapshot-immutability-tests.md` – Regressionstest für unveränderliche Store-Snapshots.

## Backlog-Übersicht

| Datei | Kategorie | Priorität | Kurzbeschreibung |
| --- | --- | --- | --- |
| [`store-snapshot-immutability-tests.md`](store-snapshot-immutability-tests.md) | Tests | Mittel | Regressionstest sicherstellen, dass Store-Snapshots außerhalb des Stores nicht mutiert werden können. |

Sobald neuer Handlungsbedarf entsteht, lege eine eigene Markdown-Datei in diesem Ordner an und verlinke sie in dieser Tabelle nach Priorität.

## Konventionen

- **Benennung**: Dateinamen verwenden `kebab-case` und beschreiben das Thema kurz und prägnant.
- **Metadaten**: Jede Datei startet mit YAML-Frontmatter und weist mindestens `status`, `priority`, `area` und `owner` aus. Optionale Felder wie `tags` oder `links` können zur Präzisierung ergänzt werden.
- **Struktur**: Jede Datei enthält die Abschnitte _Originalkritik_, _Kontext_, _Betroffene Module_ und _Lösungsideen_.
- **Verlinkungen**: Relevante Modul-Readmes verlinken auf die entsprechenden To-Dos, damit der Handlungsbedarf vor Ort sichtbar ist. Wird eine Abweichung im Soll-/Ist-Zustand entdeckt, kommt sie hier als To-Do und **nicht** ins User-Wiki.
- **Pflegehinweis**: Aktualisiere Priorität und Besitzer, sobald Entscheidungen gefallen sind, und entferne erledigte To-Dos umgehend oder verschiebe sie ins Archiv.
