# Offene Aufgaben

Dieses Verzeichnis sammelt alle offenen To-Dos für den Layout-Editor. Jede Datei beschreibt ein konkretes Thema mit Kontext, betroffenen Modulen und Lösungsideen. Sobald ein To-Do erledigt ist, wird es hier entfernt oder archiviert.

## Strukturdiagramm

- `README.md` – Index des Backlogs, beschreibt Struktur, Konventionen und Metadaten-Standard.
- `documentation-audit-state-model.md` – Audit der Dokumentation für State-, Datenmodell- und History-Flows (Status: geschlossen).
- `documentation-audit-ui-experience.md` – Review der UI-, Presenter- und Interaktionsdokumentation.
- `documentation-audit-configuration-settings.md` – Überprüfung der Konfigurations- und Settings-Dokumentation.
- `documentation-audit-integration-api.md` – Validierung der Integrations- und Plugin-API-Dokumente.
- `store-snapshot-immutability-tests.md` – Regressionstest für unveränderliche Store-Snapshots.
- `ui-accessibility-and-diagrams.md` – Sequenzdiagramme und Barrierefreiheitsrichtlinien für UI-Flows.

## Backlog-Übersicht

| Datei | Kategorie | Priorität | Kurzbeschreibung |
| --- | --- | --- | --- |
| [`ui-components-wiki.md`](ui-components-wiki.md) | Dokumentation | Hoch | Vollständiges Wiki mit Einträgen für jede UI-Komponente planen. |
| [`documentation-audit-ui-experience.md`](documentation-audit-ui-experience.md) | Dokumentation | Mittel | UI-, Presenter- und Workflow-Dokumentation auf Lücken prüfen. |
| [`documentation-audit-configuration-settings.md`](documentation-audit-configuration-settings.md) | Dokumentation | Mittel | Konfigurations-, Settings- und Fehlerpfad-Dokumentation abgleichen. |
| [`documentation-audit-integration-api.md`](documentation-audit-integration-api.md) | Dokumentation | Mittel | Integrations- und Plugin-API-Guides auf Vollständigkeit prüfen. |
| [`store-snapshot-immutability-tests.md`](store-snapshot-immutability-tests.md) | Tests | Mittel | Regressionstest sicherstellen, dass Store-Snapshots außerhalb des Stores nicht mutiert werden können. |
| [`ui-accessibility-and-diagrams.md`](ui-accessibility-and-diagrams.md) | Dokumentation | Mittel | Sequenzdiagramme und Barrierefreiheit für UI-Flows definieren. |

Sobald neuer Handlungsbedarf entsteht, lege eine eigene Markdown-Datei in diesem Ordner an und verlinke sie in dieser Tabelle nach Priorität.

## Konventionen

- **Benennung**: Dateinamen verwenden `kebab-case` und beschreiben das Thema kurz und prägnant.
- **Metadaten**: Jede Datei startet mit YAML-Frontmatter und weist mindestens `status`, `priority`, `area` und `owner` aus. Optionale Felder wie `tags` oder `links` können zur Präzisierung ergänzt werden.
- **Struktur**: Jede Datei enthält die Abschnitte _Originalkritik_, _Kontext_, _Betroffene Module_ und _Lösungsideen_.
- **Verlinkungen**: Relevante Modul-Readmes verlinken auf die entsprechenden To-Dos, damit der Handlungsbedarf vor Ort sichtbar ist. Wird eine Abweichung im Soll-/Ist-Zustand entdeckt, kommt sie hier als To-Do und **nicht** ins User-Wiki.
- **Pflegehinweis**: Aktualisiere Priorität und Besitzer, sobald Entscheidungen gefallen sind, und entferne erledigte To-Dos umgehend oder verschiebe sie ins Archiv.

## Archiv / Abgeschlossene Aufgaben

- [`documentation-audit-state-model.md`](documentation-audit-state-model.md) – Audit abgeschlossen, Ergebnis siehe Abschnitt „Ergebnis (2025-09-27)“ innerhalb der Datei.
