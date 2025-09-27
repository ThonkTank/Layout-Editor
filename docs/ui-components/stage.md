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

## Ist-Analyse Fokus & ARIA

- **Fokus:** Der Stage-Host (`div.sm-le-stage`) ist nicht fokussierbar. `focusElement` bewegt ausschließlich die Kamera; Keyboard-Fokus verbleibt auf dem auslösenden Control.
- **Pointer-Layer:** Element-Container werden als `div.sm-le-box` gerendert und reagieren nur auf Pointer (`pointerdown`, `pointermove`). Es existieren keine `tabindex`- oder `role`-Attribute.
- **Screenreader:** Element-Karten enthalten keine semantischen Beschreibungen. Die visuelle Auswahl (`is-selected`) wird nicht akustisch angekündigt, da keine Live-Region oder ARIA-Attribute gesetzt werden.
- **Live-Feedback:** Kamera-Events (`StageCamera*Event`) stehen ausschließlich Telemetrie-Loggern zur Verfügung; es gibt keine Benutzer*innen-orientierten Ansagen.

## Accessibility-Richtlinie

| Ziel | Soll-Vorgabe |
| --- | --- |
| **Fokusaufnahme** | Stage-Host erhält `tabindex="0"` und eine Tastatur-Shortcut-Brücke: `Enter` oder `Space` aus dem Strukturbaum verschiebt den Fokus auf die Stage und ruft `focusElement` auf. Beim Mount setzt die Shell `aria-label="Layout-Bühne"` (lokalisierbar via i18n). |
| **Navigation** | `Arrow`-Tasten verschieben das aktuell ausgewählte Element in 1 px-Schritten (`Shift+Arrow` = 10 px). `Ctrl+Arrow` (macOS: `Alt+Arrow`) triggert Resize entlang der Pfeilrichtung. Pointer- und Keyboard-Interaktionen teilen denselben Codepfad (`store.runInteraction`). |
| **Screenreader-Feedback** | Eine `aria-live="polite"` Region innerhalb der Stage kündigt an: „Element {Label} ausgewählt. Position X={x}, Y={y}, Größe {w}×{h}.“ Beim Verlust der Auswahl erfolgt „Keine Auswahl aktiv.“ |
| **Role & States** | Stage-Host verwendet `role="application"` für komplexe Interaktion. Einzelne `sm-le-box`-Container deklarieren `role="group"` plus `aria-roledescription="Layout-Element"` und spiegeln `is-selected` über `aria-selected="true"`. |
| **Fehler & Grenzen** | Beim Clamp auf Canvas-Ränder sendet die Live-Region Meldungen wie „Linker Rand erreicht“. Dies verhindert stumme Bewegungsabbrüche. |

> 🔎 **Implementierungsnotiz:** Keyboard-Routinen dürfen nur aktiv sein, wenn `selectedElementId` gesetzt ist; andernfalls ignorieren Stage-Listener Eingaben und die Live-Region meldet „Keine Auswahl aktiv.“

## Accessibility & Telemetrie

- Kamera- und Drag-Abläufe publizieren Events für Observability (`observeCamera`, `StageCamera*Event`). Konsumenten loggen Fokus- und Zoom-Ursachen.
- Die oben definierte Richtlinie ist verbindlich für neue Features; Abweichungen müssen in [`docs/ui-components.md`](../ui-components.md#accessibility-richtlinie-stage-tree-shell) dokumentiert und begründet werden.
