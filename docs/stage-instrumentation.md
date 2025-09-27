# Stage-Instrumentierung & Telemetrie

Die Stage des Layout-Editors bündelt mehrere Interaktionspfade (Drag, Resize, Canvas-Anpassungen). Damit wir diese Abläufe
analysieren und deterministisch testen können, stellt das State-Layer gezielte Telemetrie-Hooks bereit.

## Struktur & relevante Dateien

- [`layout-editor/src/state/layout-editor-store.ts`](../layout-editor/src/state/layout-editor-store.ts) – nutzt die Telemetrie-
  Hooks an `runInteraction`, `setCanvasSize` und beim elementweisen Clamping.
- [`layout-editor/src/state/interaction-telemetry.ts`](../layout-editor/src/state/interaction-telemetry.ts) – zentrale Sammel-
  stelle für Observer/Logger-Konfiguration und Event-Typen.
- [`layout-editor/tests/layout-editor-store.instrumentation.test.ts`](../layout-editor/tests/layout-editor-store.instrumentation.test.ts)
  – überprüft Drag- und Canvas-Resize-Szenarien inklusive Clamp-Zwischenständen.

## Konfiguration & Erweiterung

```ts
import {
    setStageInteractionObserver,
    setStageInteractionLogger,
    resetStageInteractionTelemetry,
    stageInteractionTelemetry,
    type StageInteractionLogger,
} from "layout-editor/src/state/interaction-telemetry";
```

- **Observer (`StageInteractionObserver`)**: Optionaler Hook mit speziellen Callback-Methoden (`interactionStarted`,
  `interactionFinished`, `canvasSizeEvaluated`, `clampStepObserved`). Eignet sich für ad-hoc-Analyse im Runtime-Kontext.
- **Logger (`StageInteractionLogger`)**: Empfängt jedes Telemetrie-Event als flachen Datensatz (`StageInteractionEvent`). Wird
  oft als Recording-Logger in Tests genutzt.
- **Reset (`resetStageInteractionTelemetry`)**: Setzt Observer und Logger auf No-Op zurück. Immer nach Testläufen nutzen, um
  State-Leaks zu vermeiden.

> **Hinweis:** Wird nur ein Logger gesetzt, bleiben Observer-Hooks inaktiv (No-Op). Beide Mechanismen können parallel laufen.

## Event-Typen

| Event                             | Auslöser                              | Felder                                                                 |
| --------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `interaction:start`              | `runInteraction`-Entry                | `depth` – aktuelle Interaction-Tiefe                                  |
| `interaction:end`                | `runInteraction`-Exit                 | `depth`, `hasPendingState`, `willDispatchState`, `skipExport`         |
| `canvas:size`                    | `setCanvasSize`                       | `previous`, `requested`, `result`, `changed`                          |
| `clamp:step`                     | Element-Clamping nach Canvas-Resize   | `elementId`, `previous`, `result`, `canvas`                           |

Alle Felder sind reine JSON-kompatible Werte und können ohne weitere Serialisierung geloggt oder persistiert werden.

## Kamera-Telemetrie

Die Stage sendet neben Interaktions-Hooks auch Kamera-Bewegungen. Über `StageComponent.observeCamera()` können Observer für die Viewport-Lage registriert werden; die Methode liefert ein Cleanup-Lambda zurück, das den Observer wieder deregistriert und in `StageComponent.onDestroy()` automatisch ausgeführt wird. Der optionale `StageCameraObserver` kennt drei Callbacks:

- **`onCenter`** – feuert, wenn die Kamera zentriert wird (Initialisierung oder Fokus auf ein Element). Das Event enthält `reason`, die aktuelle und die gewünschte Viewport-Beschreibung (`current`/`target`) sowie die Canvas-Ausmaße.
- **`onScroll`** – reagiert auf Panning über Pointer- oder Alt+Drag-Gesten. Neben `current`/`target` werden `delta` und die `pointerId` der Interaktion mitgeliefert.
- **`onZoom`** – liefert Zoom-Faktor, Pointer-Position im Viewport und die berechneten Welt-Koordinaten des Cursor-Fokus.

Alle Events transportieren `StageCameraViewport`-Snapshots inklusive `offset`, `scale` und abgeleiteten Weltkoordinaten. Die Stage iteriert über eine Kopie der Observer-Liste, sodass sich Callbacks während eines Events sicher deregistrieren können.

Der `StageController` reicht ein Telemetrie-Objekt über das `cameraTelemetry`-Feld an die Komponente weiter und verwaltet das Cleanup via Rückgabewert von `observeCamera()` in `dispose()`. Damit werden Observers zuverlässig entfernt, sobald der Controller zerstört oder der Host entkoppelt wird. Siehe die Implementierung in [`layout-editor/src/presenters/stage-controller.ts`](../layout-editor/src/presenters/stage-controller.ts) und die Observer-Definition in [`layout-editor/src/ui/components/stage.ts`](../layout-editor/src/ui/components/stage.ts).

Tests in [`layout-editor/tests/stage-camera.test.ts`](../layout-editor/tests/stage-camera.test.ts) decken Initial-Centering, Scroll-, Zoom- und Fokus-Sequenzen ab und stellen sicher, dass die Telemetrie die berechneten Viewports und Deltas korrekt meldet.

## Tests & Qualitätssicherung

Die Datei [`layout-editor-store.instrumentation.test.ts`](../layout-editor/tests/layout-editor-store.instrumentation.test.ts)
verwendet einen Recording-Logger, um erwartete Event-Sequenzen festzuschreiben:

- **Drag-Szenario** – prüft Start/Ende einer gebatchten Interaktion mit gemischten Export-Flags.
- **Stage-Resize-Szenario** – validiert Canvas-Resize-Events und dokumentiert Clamp-Ergebnisse pro Element.

Bei Erweiterungen neuer Event-Typen müssen Tests ergänzt werden, damit Sequenzen deterministisch bleiben.
