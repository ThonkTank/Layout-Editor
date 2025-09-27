---
status: in-review
priority: medium
area:
  - documentation
owner: unassigned
tags:
  - state-model
  - telemetry
---

# Stage/state telemetry documentation verification

## Originalkritik
- Die neue Stage-Instrumentation-Dokumentation ist erstellt, wurde jedoch noch nicht mit Analytics- und Runtime-Teams gegengeprüft.
- Snapshot- und Export-Konventionen im State-Store referenzieren den Guide indirekt; ohne Review drohen Terminologie-Drifts in künftigen Iterationen.

## Kontext
Der Guide [`docs/stage-instrumentation.md`](../layout-editor/docs/stage-instrumentation.md) beschreibt alle Telemetrie-Events, Pflichtfelder und Reset-Regeln. State- und Presenter-Readmes verweisen nun darauf. Bevor das ursprüngliche Audit geschlossen werden kann, müssen wir sicherstellen, dass die Pipeline (`layout-editor/src/state/interaction-telemetry.ts`) und die Analytics-Observer denselben Vertragsstand nutzen und dass historische Dashboards auf neue Eventfelder vorbereitet sind.

## Betroffene Module
- `layout-editor/src/state/interaction-telemetry.ts`
- `layout-editor/docs/stage-instrumentation.md`
- `layout-editor/src/presenters/README.md`
- Analytics-/Observer-Konfiguration (extern dokumentiert)

## Lösungsideen
- Review-Termin mit Analytics-Team einplanen, um Eventnamen, Pflichtfelder und Reset-Semantik abzugleichen.
- Dashboard- und Alert-Konfigurationen darauf prüfen, ob neue Pflichtfelder (`camera`, `resetReason` etc.) korrekt verarbeitet werden.
- Nach Abschluss des Reviews das Audit als erledigt markieren und aus dem Backlog entfernen.
