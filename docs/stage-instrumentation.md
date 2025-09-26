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

## Tests & Qualitätssicherung

Die Datei [`layout-editor-store.instrumentation.test.ts`](../layout-editor/tests/layout-editor-store.instrumentation.test.ts)
verwendet einen Recording-Logger, um erwartete Event-Sequenzen festzuschreiben:

- **Drag-Szenario** – prüft Start/Ende einer gebatchten Interaktion mit gemischten Export-Flags.
- **Stage-Resize-Szenario** – validiert Canvas-Resize-Events und dokumentiert Clamp-Ergebnisse pro Element.

Bei Erweiterungen neuer Event-Typen müssen Tests ergänzt werden, damit Sequenzen deterministisch bleiben.
