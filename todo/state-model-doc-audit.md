---
status: open
priority: high
area:
  - documentation
owner: unassigned
tags:
  - state-model
  - telemetry
---

# State/model documentation audit

## Originalkritik
- Das State-README verweist auf einen "stage instrumentation"-Guide, dessen gültiger Speicherort (`docs/stage-instrumentation.md`) konsistent nachgezogen werden muss, damit Telemetrie-Konventionen verbindlich dokumentiert bleiben.
- Die Store-Dokumentation beschreibt Telemetrie-Ereignisse nur implizit; ohne zentrale Referenz droht Drift zwischen `stageInteractionTelemetry` und künftigen Erweiterungen.

## Kontext
Die Telemetrie-Pipeline (`stageInteractionTelemetry` in `layout-editor/src/state/interaction-telemetry.ts`) emittiert Ereignisse wie `interaction:start`, `interaction:end`, `canvas:size` und `clamp:step`. Das State-README forderte bislang, neue Events im nicht vorhandenen `layout-editor/docs/stage-instrumentation.md` zu dokumentieren; der Guide liegt faktisch unter [`docs/stage-instrumentation.md`](../docs/stage-instrumentation.md). Gleichzeitig hängt die Konsistenz von Snapshot-Emissionen und Export-Payloads an `cloneLayoutElement`; ohne eine aktualisierte Referenz fällt die Abstimmung zwischen Store-, Modell- und Analytics-Teams schwer.

## Betroffene Module
- `layout-editor/src/state/README.md`
- `layout-editor/src/state/interaction-telemetry.ts`
- `layout-editor/docs/data-model-overview.md`
- Stage-Instrumentations-Guide [`docs/stage-instrumentation.md`](../docs/stage-instrumentation.md)

## Lösungsideen
- Stage-Instrumentations-Guide neu erstellen: Ereignis-Typen, Pflichtfelder, Reset-Konventionen und Logger-Verhalten beschreiben sowie Beispiel-Implementierungen für Observer/Logger aufnehmen.
- State-README und übrige Referenzdokumente auf den neuen Guide verlinken und veraltete Hinweise auf nicht vorhandene Dateien entfernen.
- Prüfen, ob weitere Dokumente (User-Wiki, API-Referenzen) auf Snapshots und Telemetrie verweisen und die Terminologie vereinheitlichen.
