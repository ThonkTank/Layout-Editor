# Layout Editor – State & History Soll-Zustand

## Struktur

```
docs/
├─ layout-editor-state-history.md
├─ api-migrations.md
├─ persistence-diagnostics.md
├─ stage-instrumentation.md
└─ ui-components.md
```

## Zweck

Dieses Dokument fasst den Soll-Zustand der State-, Snapshot- und History-Flows des Layout-Editors für Produkt- und Integrations-
teams zusammen. Es beschreibt verständlich, wann welche Snapshots entstehen, wie Export/Undo/Redo zusammenspielen und welche
Telemetrie-Events dabei verpflichtend sind. Für Implementierungsdetails verweisen die Querverweise auf die technischen Guides.

## Terminologie

- **LayoutEditorState** – UI-orientierter Store-State mit Canvas- und Workflow-Metadaten. Details: [`layout-editor/src/state/README.md#terminologie`](../layout-editor/src/state/README.md#terminologie).
- **LayoutEditorSnapshot** – tief geklonter Zustand für History/Export. Technischer Hintergrund: [`layout-editor/docs/data-model-overview.md#terminologie`](../layout-editor/docs/data-model-overview.md#terminologie).
- **LayoutBlueprint / SavedLayout** – Export-JSON mit bzw. ohne Persistenzmetadaten. Siehe [`layout-editor/docs/data-model-overview.md#snapshot--und-persistenzformate`](../layout-editor/docs/data-model-overview.md#snapshot--und-persistenzformate).
- **History Patch** – differenzbasierter Eintrag (`redo`/`undo`) innerhalb des History-Fensters. Details: [`layout-editor/docs/history-design.md#terminologie`](../layout-editor/docs/history-design.md#terminologie).
- **Stage Interaction Events** – Telemetrie-Ereignisse (`interaction:*`, `canvas:size`, `clamp:step`) zur Nachvollziehbarkeit von Benutzeraktionen. Erläuterung: [`docs/stage-instrumentation.md`](stage-instrumentation.md).

## Workflow-Sequenzen

### 1. Subscription & Export-Handshake

1. Presenter registrieren Listener via `store.subscribe(listener)`.
2. Der Store sendet unmittelbar ein `state`-Event mit `LayoutEditorState` gefolgt von einem `export`-Event mit dem aktuellen JSON.
3. Weitere `state`-/`export`-Paare entstehen erst nach Mutationen oder einem expliziten `flushExport()`.
4. Tests sichern diesen Ablauf ab (`layout-editor/tests/layout-editor-store.test.ts`). Technische Details: [`layout-editor/src/state/README.md#ereignisse--sequenzen`](../layout-editor/src/state/README.md#ereignisse--sequenzen).

### 2. Mutation → Snapshot → History → Export

1. Alle Mutationen laufen über Store-APIs (`createElement`, `moveElement`, `assignElementToContainer`, …).
2. Der Store aktualisiert den `LayoutTree`, erzeugt neue Snapshots (`getElementsSnapshot()` + `cloneLayoutElement`) und markiert den Export als `dirty`.
3. `commitHistory()` erstellt differenzbasierte Patches, solange `LayoutHistory.isRestoring === false`.
4. Nach Ende einer `runInteraction()`-Sequenz sendet der Store das gepufferte `state`-/`export`-Paar.
5. Export-Payloads werden gerundet und enthalten die letzten Persistenz-Metadaten.
6. Validiert durch `layout-editor/tests/layout-editor-store.test.ts` und `layout-editor/tests/layout-tree.test.ts`. Dokumentiert in [`layout-editor/docs/data-model-overview.md#sequenzübersichten`](../layout-editor/docs/data-model-overview.md#sequenzübersichten).

### 3. Undo/Redo & History-Fenster

1. `undo()`/`redo()` navigieren innerhalb des 50-Einträge-Fensters (`MAX_HISTORY_ENTRIES`).
2. Jedes Replay setzt `LayoutHistory.isRestoring = true`, um währenddessen keine neuen Einträge zu erzeugen.
3. Nach Abschluss aktualisiert der Store `canUndo/canRedo`, markiert den Export als `dirty` und publiziert neue `state`-/`export`-Events.
4. Überlauf verschiebt den ältesten Patch in die Baseline; Undo stoppt automatisch an dieser Grenze.
5. Tests: `layout-editor/tests/history-limits.test.ts`. Prozessdokumentation: [`layout-editor/docs/history-design.md#sequenzen`](../layout-editor/docs/history-design.md#sequenzen).

### 4. Import / Reset Workflow

1. Beim Laden (`applySavedLayout`) ersetzt der Store Canvas-Daten, Element-Baum und Persistenzmetadaten.
2. `history.reset()` setzt Baseline und Cursor neu, damit Undo/Redo direkt auf dem importierten Zustand starten.
3. `serializeState()` produziert sofort eine neue Export-Payload; `flushExport()` ist nur nötig, wenn Integratoren außerhalb der Interaktionssequenz explizit laden.
4. Referenz: [`layout-editor/src/state/README.md#export--und-serialisierungsfluss`](../layout-editor/src/state/README.md#export--und-serialisierungsfluss).

## Edge Cases & Leitplanken

- **Snapshot-Immutabilität:** Externe Mutationen an gelieferten States oder History-Snapshots haben keine Wirkung; Tests decken das ab (`layout-editor/tests/layout-editor-store.test.ts`, `layout-editor/tests/history-limits.test.ts`).
- **Skip-Export-Drag:** Während Drag-Operationen dürfen Presenter `skipExport: true` setzen. Der Export wird erst mit `flushExport()` aktualisiert. Dokumentiert in [`layout-editor/src/state/README.md#edge-cases--schutzmechanismen`](../layout-editor/src/state/README.md#edge-cases--schutzmechanismen).
- **Canvas-Clamping:** `setCanvasSize()` clampet auf 200–2000 px und löst `canvas:size` + `clamp:step` Events aus. Telemetrie-Anforderungen siehe [`stage-instrumentation.md`](stage-instrumentation.md) und Tests in `layout-editor/tests/layout-editor-store.instrumentation.test.ts`.
- **History-Overflow:** Sobald mehr als 50 Patches anfallen, werden sie in die Baseline gemerged. Undo stoppt bei der ältesten noch verfügbaren Version. Technischer Hintergrund: [`layout-editor/docs/history-design.md#edge-cases--tests`](../layout-editor/docs/history-design.md#edge-cases--tests).
- **ID-Kohärenz & Reparenting:** Der `LayoutTree` bereinigt ungültige `parentId`-Referenzen und synchronisiert Kinderreihenfolgen. Siehe [`layout-editor/src/model/README.md#edge-cases--tests`](../layout-editor/src/model/README.md#edge-cases--tests).

## Telemetrie & Monitoring

- Jede Benutzerinteraktion ist mit `stageInteractionTelemetry` zu kapseln (`interaction:start`/`interaction:end`).
- Canvas-Änderungen publizieren `canvas:size`; nachfolgende Clamps erzeugen pro Element ein `clamp:step` Event.
- Logger erhalten alle Events zusätzlich zu spezifischen Observer-Hooks (`layout-editor/src/state/interaction-telemetry.ts`).
- Monitoring-Vorgaben und KPIs: [`stage-instrumentation.md`](stage-instrumentation.md) sowie [`layout-editor/src/state/README.md#telemetrie`](../layout-editor/src/state/README.md#telemetrie).

## Weiterführende Dokumente

- Technische Detailtiefe zum Store: [`layout-editor/src/state/README.md`](../layout-editor/src/state/README.md)
- Modell- und Snapshot-Hintergründe: [`layout-editor/src/model/README.md`](../layout-editor/src/model/README.md), [`layout-editor/docs/data-model-overview.md`](../layout-editor/docs/data-model-overview.md)
- History-Design: [`layout-editor/docs/history-design.md`](../layout-editor/docs/history-design.md)
- Relevante Tests: `layout-editor/tests/layout-editor-store.test.ts`, `layout-editor/tests/layout-editor-store.instrumentation.test.ts`, `layout-editor/tests/history-limits.test.ts`, `layout-editor/tests/layout-tree.test.ts`

