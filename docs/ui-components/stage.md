# Stage (Canvas)

**Zweck:** Die Stage visualisiert das aktive Layout, kapselt Kamera- und Pointer-Interaktionen und synchronisiert Selektion, Drag-Status und Export-Trigger mit dem Store. Implementiert durch [`StageComponent`](../../layout-editor/src/ui/components/stage.ts).

## Primäre Interaktionen

1. **Auswahl & Fokus-Handshake**
   - Klick auf leeren Canvas hebt die Auswahl auf und informiert Presenter über `onSelectElement(null)`.
   - Element-Klick setzt `selectedElementId`; Presenter lösen den Fokus-Workflow gemäß [`layout-editor/src/ui/README.md`](../../layout-editor/src/ui/README.md#fokus-handshake-tree--stage) aus.
   - `focusElement` richtet Kamera und Telemetrie (`reason: "focus"`) nach Tree- oder Presenter-Aufrufen aus.
2. **Drag & Resize**
   - Pointer-Events werden über Scope-Listener registriert; `store.runInteraction()` bündelt Move/Resize-Frames.
   - Drag- und Resize-Operationen clampen Positionen sowie Größe (`MIN_ELEMENT_SIZE`) innerhalb der Canvas-Abmessungen.
   - `store.flushExport()` wird nach `pointerup` ausgelöst, damit Header/Notice den finalen Export erhalten.
3. **Kamera-Steuerung**
   - Lazy-Initialisierung (erste `requestAnimationFrame`) ruft `centerCamera` und emittiert `StageCameraCenterEvent` mit `reason: "initial"`.
   - `wheel`-Zoom berechnet Weltkoordinaten und publiziert `StageCameraZoomEvent`.
   - Middle-Button-Pan verarbeitet `StageCameraScrollEvent` und sperrt weitere Pointer bis Cleanup.

## Zustandsmodell

| Zustand | Auslöser | Sichtbares Verhalten |
| --- | --- | --- |
| Initialisierung | Erste `syncStage`-Mutation nach Mount | Canvas-Größe wird gesetzt, Kamera startet nachgelagert. |
| Selektion aktiv | `selectedElementId !== null` | DOM-Knoten markiert `is-selected`; Inspector & Tree spiegeln Auswahl. |
| Interaktion | Pointer-Drag/Resize aktiv, Snapshot läuft | Cursor-Update (`is-interacting`), DiffRenderer pausiert unnötige Reflows. |
| Kamera-Fokus | Presenter ruft `focusElement` | Kamera zentriert Ziel, Telemetrie-Observer erhalten `reason: "focus"`. |
| Leerer Canvas | `elements.length === 0` | Stage bleibt leer, `onSelectElement(null)` deaktiviert Inspector. |

## Abhängigkeiten & Integrationen

- **Store & Presenter:** Nutzt `LayoutEditorStore.runInteraction()` und `store.flushExport()`; handshake mit `StructurePanelPresenter` laut [`layout-editor/src/ui/README.md`](../../layout-editor/src/ui/README.md#fokus-handshake-tree--stage).
- **Renderer:** Diffing erfolgt über [`DiffRenderer`](diff-renderer.md); Element-Previews stammen aus [`renderElementPreview`](../../layout-editor/src/ui/element-preview.ts).
- **Tests:** Verhalten abgesichert in [`layout-editor/tests/ui-component.test.ts`](../../layout-editor/tests/ui-component.test.ts) und [`layout-editor/tests/ui-diff-renderer.test.ts`](../../layout-editor/tests/ui-diff-renderer.test.ts).
- **Performance & Telemetrie:** Siehe [`layout-editor/docs/ui-performance.md`](../../layout-editor/docs/ui-performance.md#stage-component) und [`docs/stage-instrumentation.md`](../stage-instrumentation.md#kamera-telemetrie).

## Accessibility & Telemetrie

- Kamera- und Drag-Abläufe publizieren Events für Observability (`observeCamera`, `StageCamera*Event`). Konsumenten loggen Fokus- und Zoom-Ursachen.
- Tastatursteuerung der Elementfokussierung ist offen; siehe To-Do [`todo/ui-component-accessibility-spec.md`](../../todo/ui-component-accessibility-spec.md) für Barrierefreiheitsanforderungen.
- Screenreader-Ankündigungen und Assistive-Technologien folgen denselben To-Dos; zusätzliche Spezifikationen werden dort gepflegt.
