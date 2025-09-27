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

### Terminologie

- **`LayoutEditorState`** – UI-orientierter State für Presenter mit Canvas-Metadaten, Undo/Redo-Flags, laufenden Operationen und `LayoutElement`-Snapshots.
- **`LayoutEditorSnapshot`** – persistenzfähiger Snapshot für History und Export. Entsteht über `captureSnapshot()` und gelangt unverändert an `LayoutHistory` sowie `serializeState()`.
- **`LayoutEditorStoreEvent`** – Union aus `state`- und `export`-Events; `subscribe()` publiziert immer zuerst `state`, anschließend `export`.
- **`LayoutBlueprint`/`SavedLayout`** – JSON-Verträge für Exporte bzw. gespeicherte Layouts (siehe [`types.ts`](../types.ts)).
- **Export-Payload** – von `serializeState()` erzeugter JSON-String auf Basis des `LayoutBlueprint` plus Persistenz-Metadaten.

### Snapshot-Lifecycle

- `subscribe` liefert initiale `state`- und `export`-Events und hält Listener mit geklonten Snapshots synchron.
- `getState()` und jedes `state`-Event basieren auf `createSnapshot()`, das `cloneLayoutElement` für alle Baumknoten nutzt. Mutationen an Snapshots bleiben folgenlos.
- Änderungen an Elementen laufen immer über den `LayoutTree`; nach jeder Mutation sorgt `markStateMutated()` dafür, dass `serializeState()` bei Bedarf einen neuen Export-Payload erzeugt.
- `emitState()` bündelt Ereignisse während `runInteraction()`-Blöcken. Sobald die Interaktionstiefe wieder 0 ist, wird – abhängig vom `skipExport`-Flag – ein `state`-/`export`-Paar dispatcht.
- `flushExport()` zwingt eine sofortige `export`-Emission und sollte nach `skipExport`-Operationen genutzt werden, wenn externe Konsumenten frische JSON-Payloads benötigen.

### Export- und Serialisierungsfluss

- `serializeState()` rundet Canvas- sowie Element-Geometrie (`x`, `y`, `width`, `height`) und liefert JSON im `LayoutBlueprint`-Schema inklusive `id`, `name`, `createdAt`, `updatedAt` aus den `lastSavedLayout*`-Feldern.
- `ensureExportPayload()` cached die letzte Serialisierung; `exportDirty` wird ausschließlich über `markStateMutated()` gesetzt.
- Drag-Operationen nutzen `skipExport`, damit `state`-Events während `runInteraction()` emittiert, `export` jedoch bis `flushExport()` verzögert wird ([`layout-editor-store.test.ts`](../../tests/layout-editor-store.test.ts)).
- Persistente Mutationen (`applySavedLayout`, Imports) setzen nach `history.reset()` unmittelbar neue Export-Payloads, damit Undo/Redo ab Baseline konsistent bleibt.

### History-Integration

- Der Store hält eine `LayoutHistory`-Instanz (siehe [`history-design`](../../docs/history-design.md)). Über `commitHistory()` bzw. `pushHistorySnapshot()` werden differenzbasierte Patches registriert.
- `captureSnapshot()` liefert die Grundlage für History-Patches und Undo/Redo; `restoreSnapshot()` lädt Elemente erneut in den `LayoutTree` und triggert anschließend einen State-Emit.
- Während History-Replays meldet `LayoutHistory.isRestoring` laufende Wiederherstellungen. `commitHistory()` prüft diese Flagge und verhindert dadurch Re-Entrancy-Bugs.
- Undo/Redo aktualisiert nach dem Replay erneut die abgeleiteten Flags (`canUndo`, `canRedo`) und stößt Export-Revalidierungen an.

### Ereignisse & Sequenzen

1. **Subscription-Handshake** – `subscribe()` sendet unmittelbar `state` gefolgt von `export`. Tests sichern Reihenfolge und Immutabilität (`layout-editor-store.test.ts`).
2. **Interaktionszyklus** – `runInteraction()` erhöht `interactionDepth`, feuert `interaction:start`, führt Mutationen aus und schließt mit `interaction:end`. Bei `depth === 1` werden gesammelte State-/Export-Emissionen abgewickelt.
3. **History-Kommit** – Nach jeder Mutation ruft der Store `markStateMutated()` und `emitState()`. Sobald ein Replay endet, sorgt `commitHistory()` dafür, dass neue Snapshots nur außerhalb von `isRestoring` registriert werden.
4. **Export-Flush** – `flushExport()` prüft `exportDirty`. Liegen keine Änderungen vor, erfolgt keine erneute Emission (`layout-editor-store.test.ts`).

### Telemetrie

- `runInteraction()` kapselt jede Benutzeraktion, erhöht/dekrementiert die Interaktionstiefe und feuert `interaction:start`/`interaction:end` über `stageInteractionTelemetry`.
- `setCanvasSize()` erzeugt `canvas:size`-Events inklusive voriger, angefragter und resultierender Maße.
- `clampElementsToCanvas()` meldet jedes Clamping als `clamp:step` (Element-ID, vorheriger Frame, Ergebnis und Canvas-Dimensionen).
- Die Event-Typen und Observer-Schnittstellen sind in [`interaction-telemetry.ts`](./interaction-telemetry.ts) definiert; Detailbeschreibung und Testanforderungen stehen im [Stage-Instrumentation Guide](../../../docs/stage-instrumentation.md).
- Sequenzen und erwartete Payloads werden in [`layout-editor-store.instrumentation.test.ts`](../../tests/layout-editor-store.instrumentation.test.ts) abgesichert.

## interaction-telemetry.ts

Der Telemetrie-Hub stellt Observer- und Logger-Schnittstellen (`StageInteractionObserver`, `StageInteractionLogger`) bereit, normalisiert Events (`StageInteractionEvent`) und bietet Helper zum Setzen/Zurücksetzen aktiver Hooks. Logger erhalten jedes Event zusätzlich zu konkreten Observer-Callbacks.

## Konventionen & Erweiterungspunkte

- UI-/Presenter-Code darf Editor-Elemente ausschließlich über Store-APIs mutieren (`moveElement`, `resizeElement`, `offsetChildren`, `applyElementSnapshot`, …). Direkte Array-Manipulationen im Snapshot gehen beim nächsten Tree-Sync verloren.
- Bei neuen State-Feldern `LayoutEditorState` sowie Export-/Restore-Flows synchron aktualisieren. Outbound-Snapshots bleiben unveränderlich.
- Neue History-Transitionen müssen `commitHistory()` durchlaufen, damit Undo/Redo konsistent bleibt. Für Patch-Richtlinien siehe [History-Design](../../docs/history-design.md).
- Telemetrie-Erweiterungen erfordern: neue Payload-Typen in `StageInteractionEvent`, angepasste Tests (`layout-editor-store.instrumentation.test.ts`) und Dokumentations-Updates im Stage-Instrumentation Guide. Tests müssen `resetStageInteractionTelemetry()` verwenden, um Hook-Leaks zu vermeiden.
- Baumstruktur, Eltern-/Kind-Validierung und weitere Invarianten gehören in das [`model`](../model/README.md); der Store konsumiert diese Fähigkeiten.
- Edge-Cases wie Snapshot-Immutabilität (`layout-editor-store.test.ts`) und Export-Drosselung müssen durch Regressionstests abgesichert bleiben.

### Edge-Cases & Schutzmechanismen

- **Snapshot-Immutabilität** – Externe Mutationen an `LayoutEditorState` oder History-Snapshots beeinflussen den Store nicht (`layout-editor-store.test.ts`, `history-limits.test.ts`).
- **Skip-Export-Drag** – Während Drag-Operationen bleiben Export-Payloads eingefroren, bis `flushExport()` aufgerufen wird; erneute Flushes ohne Änderungen emittieren nichts (`layout-editor-store.test.ts`).
- **History-Replays** – `LayoutHistory.isRestoring` verhindert Doppel-Komits; Undo/Redo aktualisieren `canUndo/canRedo` nach jedem Replay.
- **Canvas-Clamping** – `setCanvasSize()` clampet auf 200–2000 px und löst `clamp:step` für betroffene Elemente aus (`layout-editor-store.instrumentation.test.ts`).
- **Import/Reset** – `applySavedLayout()` setzt Baseline-Snapshots und Export-Payloads neu, damit Undo/Redo am importierten Zustand ansetzen.

## Navigation

- [Data Model Overview](../../docs/data-model-overview.md)
- [History Design](../../docs/history-design.md)
- [Stage-Instrumentation Guide](../../../docs/stage-instrumentation.md)
- [State- & History-Sollzustand](../../../docs/layout-editor-state-history.md)

## Offene Punkte

- Keine – Änderungen bitte direkt mit Regressionstests und den oben genannten Dokumenten abstimmen.
