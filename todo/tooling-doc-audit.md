---
status: open
priority: medium
area:
  - documentation
owner: unassigned
tags:
  - tooling
  - tests
---

# Tooling-Dokumentationsabgleich

## Originalkritik
- `docs/README.md` muss alle Dateien im Wurzel-`docs/`-Verzeichnis (z. B. `persistence-diagnostics.md`, `stage-instrumentation.md`) abbilden und korrekt auf sie verlinken.
- `layout-editor/tests/README.md` erwähnt den Ordner `helpers/` nicht, der als gemeinsames Test-Hilfsverzeichnis geführt wird, wodurch die Strukturübersicht lückenhaft bleibt.

## Kontext
- Abgleich der Test-, Tooling- und Benutzer-Dokumentation mit dem aktuellen Repository-Zustand im Rahmen des Tooling-Dokumentationsaudits.
- Fokus auf Strukturangaben und Dateiverweise, ohne inhaltliche Aktualisierung der beschriebenen Workflows.

## Betroffene Module
- `docs/README.md`
- `layout-editor/tests/README.md`

## Lösungsideen
- Ergänze `docs/README.md` um die fehlenden Dateien im Abschnitt „Dateien in `docs/`“ und korrigiere den fehlerhaften Verweis auf die Diagnose-Dokumentation.
- Beschreibe den Ordner `helpers/` in `layout-editor/tests/README.md`, inklusive Zweck (z. B. geteilte Fixtures), damit neue Beiträge die Struktur nachvollziehen können.
