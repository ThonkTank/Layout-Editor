# Offene Aufgaben

Dieses Verzeichnis sammelt alle offenen To-Dos für den Layout-Editor. Jede Datei beschreibt ein konkretes Thema mit Kontext, betroffenen Modulen und Lösungsideen. Sobald ein To-Do erledigt ist, wird es hier entfernt oder archiviert.

## Strukturdiagramm

- `README.md` – Index des Backlogs, beschreibt Struktur, Konventionen und Metadaten-Standard.
- `element-library-doc-audit.md` – Dokumentationsaudit zur Element-Bibliothek und ihrem Manifest.
- `persistence-config-i18n-doc-audit.md` – Abgleich zwischen Domain-Toggle-Dokumentation und Seed-Synchronisation.
- `plugin-shell-doc-audit.md` – Prüfung der Shell-Dokumentation gegen den tatsächlich exportierten API-Umfang.
- `presenter-doc-audit.md` – Audit der Presenter-Dokumentation hinsichtlich Telemetrie-, Drag/Drop- und Fehler-Workflows.
- `state-model-doc-audit.md` – Konsistenzcheck der State-/Telemetry-Dokumentation inklusive fehlendem Stage-Instrumentation-Guide.
- `tooling-doc-audit.md` – Index- und Strukturabgleich der Tooling- und Testdokumentation.
- `ui-components-doc-audit.md` – Aktualisierung der UI-Komponenten-Konventionen rund um den `DiffRenderer`.

## Backlog-Übersicht

| Datei | Kategorie | Priorität | Kurzbeschreibung |
| --- | --- | --- | --- |
| [`element-library-doc-audit.md`](element-library-doc-audit.md) | Dokumentation | Mittel | Manifest- und Preview-Hooks in den Element-Readmes ergänzen. |
| [`persistence-config-i18n-doc-audit.md`](persistence-config-i18n-doc-audit.md) | Dokumentation&nbsp;/&nbsp;Runtime | Hoch | Seed-Sync-Verhalten beim Domain-Toggle dokumentieren oder implementieren. |
| [`plugin-shell-doc-audit.md`](plugin-shell-doc-audit.md) | API&nbsp;/&nbsp;Dokumentation | Hoch | Registry-Diagnosehelfer zwischen Dokumentation und Export abgleichen. |
| [`presenter-doc-audit.md`](presenter-doc-audit.md) | Dokumentation | Mittel | Presenter-Workflows zu Telemetrie, Drag/Drop und Fehlern nachziehen. |
| [`state-model-doc-audit.md`](state-model-doc-audit.md) | Dokumentation | Hoch | Stage-Instrumentation-Guide neu erstellen und Verweise korrigieren. |
| [`tooling-doc-audit.md`](tooling-doc-audit.md) | Tooling-Dokumentation | Mittel | Docs-Index und Test-README an den aktuellen Strukturstand anpassen. |
| [`ui-components-doc-audit.md`](ui-components-doc-audit.md) | Dokumentation | Mittel | `DiffRenderer`-Konventionen aktualisieren und Scope-Nutzung erläutern. |

## Konventionen

- **Benennung**: Dateinamen verwenden `kebab-case` und beschreiben das Thema kurz und prägnant.
- **Metadaten**: Jede Datei startet mit YAML-Frontmatter und weist mindestens `status`, `priority`, `area` und `owner` aus. Optionale Felder wie `tags` oder `links` können zur Präzisierung ergänzt werden.
- **Struktur**: Jede Datei enthält die Abschnitte _Originalkritik_, _Kontext_, _Betroffene Module_ und _Lösungsideen_.
- **Verlinkungen**: Relevante Modul-Readmes verlinken auf die entsprechenden To-Dos, damit der Handlungsbedarf vor Ort sichtbar ist. Wird eine Abweichung im Soll-/Ist-Zustand entdeckt, kommt sie hier als To-Do und **nicht** ins User-Wiki.
- **Pflegehinweis**: Aktualisiere Priorität und Besitzer, sobald Entscheidungen gefallen sind, und entferne erledigte To-Dos umgehend oder verschiebe sie ins Archiv.
