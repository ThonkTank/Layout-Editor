# State

Das State-Layer kapselt sämtliche Editor-Zustände, orchestriert History-Replays und bündelt Telemetrie-Hooks für die Canvas.

## Struktur

```
state/
├─ README.md
├─ interaction-telemetry.ts
└─ layout-editor-store.ts
```

## LayoutEditorStore

`layout-editor-store.ts` stellt den `LayoutEditorStore` als zentrale Fassade bereit. Er verwaltet Canvas-Geometrie (`canvasWidth`, `canvasHeight`), Auswahl- und Drag-State, laufende Speicher-/Import-Vorgänge sowie die Metadaten des zuletzt gespeicherten Layouts. Öffentliche Snapshots (`LayoutEditorState`) liefern ausschließlich tief geklonte Elementdaten.

### Snapshot-Lifecycle

- `subscribe` liefert initiale `state`- und `export`-Events und hält Listener mit geklonten Snapshots synchron.
- `getState()` und jedes `state`-Event basieren auf `createSnapshot()`, das `cloneLayoutElement` für alle Baumknoten nutzt. Mutationen an Snapshots sind damit folgenlos.
- Änderungen an Elementen laufen immer über den `LayoutTree`; nach jeder Mutation sorgt `markStateMutated()` dafür, dass `serializeState()` bei Bedarf einen neuen Export-Payload erzeugt.
- `emitState()` bündelt Ereignisse während `runInteraction()`-Blöcken. Sobald die Interaktionstiefe wieder 0 ist, wird – abhängig vom `skipExport`-Flag – ein `state`-/`export`-Paar dispatcht.
- `flushExport()` zwingt eine sofortige `export`-Emission und sollte nach `skipExport`-Operationen genutzt werden, wenn externe Konsumenten frische JSON-Payloads benötigen.

### History-Integration

- Der Store hält eine `LayoutHistory`-Instanz (siehe [`history-design`](../../docs/history-design.md)). Über `commitHistory()` bzw. `pushHistorySnapshot()` werden differenzbasierte Patches registriert.
- `captureSnapshot()` liefert die Grundlage für History-Patches und Undo/Redo; `restoreSnapshot()` lädt Elemente erneut in den `LayoutTree` und triggert anschließend einen State-Emit.
- Während History-Replays meldet `LayoutHistory.isRestoring` laufende Wiederherstellungen. `commitHistory()` prüft diese Flagge und verhindert dadurch Re-Entrancy-Bugs.
- Undo/Redo aktualisiert nach dem Replay erneut die abgeleiteten Flags (`canUndo`, `canRedo`) und stößt Export-Revalidierungen an.

### Telemetrie

- `runInteraction()` kapselt jede Benutzeraktion, erhöht/dekrementiert die Interaktionstiefe und feuert `interaction:start`/`interaction:end` über `stageInteractionTelemetry`.
- `setCanvasSize()` erzeugt `canvas:size`-Events inklusive voriger, angefragter und resultierender Maße.
- `clampElementsToCanvas()` meldet jedes Clamping als `clamp:step` (Element-ID, vorheriger Frame, Ergebnis und Canvas-Dimensionen).
- Die Event-Typen und Observer-Schnittstellen sind in [`interaction-telemetry.ts`](./interaction-telemetry.ts) definiert; Detailbeschreibung und Testanforderungen stehen im [Stage-Instrumentation Guide](../../../docs/stage-instrumentation.md).

## interaction-telemetry.ts

Der Telemetrie-Hub stellt Observer- und Logger-Schnittstellen (`StageInteractionObserver`, `StageInteractionLogger`) bereit, normalisiert Events (`StageInteractionEvent`) und bietet Helper zum Setzen/Zurücksetzen aktiver Hooks. Logger erhalten jedes Event zusätzlich zu konkreten Observer-Callbacks.

## Konventionen & Erweiterungspunkte

- UI-/Presenter-Code darf Editor-Elemente ausschließlich über Store-APIs mutieren (`moveElement`, `resizeElement`, `offsetChildren`, `applyElementSnapshot`, …). Direkte Array-Manipulationen im Snapshot gehen beim nächsten Tree-Sync verloren.
- Bei neuen State-Feldern `LayoutEditorState` sowie Export-/Restore-Flows synchron aktualisieren. Outbound-Snapshots bleiben unveränderlich.
- Neue History-Transitionen müssen `commitHistory()` durchlaufen, damit Undo/Redo konsistent bleibt. Für Patch-Richtlinien siehe [History-Design](../../docs/history-design.md).
- Telemetrie-Erweiterungen erfordern: neue Payload-Typen in `StageInteractionEvent`, angepasste Tests (`layout-editor-store.instrumentation.test.ts`) und Dokumentations-Updates im Stage-Instrumentation Guide. Tests müssen `resetStageInteractionTelemetry()` verwenden, um Hook-Leaks zu vermeiden.
- Baumstruktur, Eltern-/Kind-Validierung und weitere Invarianten gehören in das [`model`](../model/README.md); der Store konsumiert diese Fähigkeiten.

## Navigation

- [Data Model Overview](../../docs/data-model-overview.md)
- [History Design](../../docs/history-design.md)
- [Stage-Instrumentation Guide](../../../docs/stage-instrumentation.md)

## Offene Punkte

- Konsolidierte Soll/Ist-Prüfung siehe [`documentation-audit-state-model.md`](../../todo/documentation-audit-state-model.md).
