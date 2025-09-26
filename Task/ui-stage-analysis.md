# Stage Interaction & Relayout Analysis

## Zweck & Einordnung
Diese Analyse dokumentiert den aktuellen Pointer-Move- und Resize-Flow innerhalb der `StageComponent` und beschreibt, wie deren Events den `LayoutEditorStore` ansteuern. Der Fokus liegt auf den Mechanismen, die Positionen und Größen hart auf die Canvas-Grenzen begrenzen, sowie auf nachgelagerten Container-Reflows.

## Dateikontext in diesem Ordner
- `README.md` – Überblick über das Bug-Szenario "rechter Rand festgenagelt" sowie Verweise auf weiterführende Module.
- `ui-stage-analysis.md` (dieses Dokument) – Tiefenanalyse der Stage-Interaktionen und Container-Relayouts.

## Pointer-Flow in der StageComponent
1. **Pointer-Einstieg & Cursor-Modus** – Jeder gerenderte Knoten registriert Pointer-Handler, die per `resolveInteractionMode` zwischen Drag- und Resize-Operationen unterscheiden und den Cursor setzen.【F:layout-editor/src/ui/components/stage.ts†L157-L205】【F:layout-editor/src/ui/components/stage.ts†L360-L379】
2. **BeginMove** – Beim Draggen werden Ursprungskordinaten eingefroren, der Pointer-Delta berechnet und anschließend explizit auf `0…canvasWidth - width` bzw. `0…canvasHeight - height` begrenzt, bevor `store.runInteraction` ausgeführt wird.【F:layout-editor/src/ui/components/stage.ts†L242-L268】 Innerhalb dieser Batched-Operation ruft die Stage `moveElement(..., { skipExport: true })` auf. Der Store wiederholt die Begrenzung (inklusive `clamp`) und aktualisiert optional Kindknoten (cascade).【F:layout-editor/src/state/layout-editor-store.ts†L369-L388】
3. **BeginResize** – Analog zum Move-Flow berechnet die Stage neue Kanten, limitiert Werte gegen `MIN_ELEMENT_SIZE` und das Canvas-Maß, ruft anschließend `moveElement` (ohne Cascading) und `resizeElement` mit `skipExport: true` auf.【F:layout-editor/src/ui/components/stage.ts†L285-L343】 Die Store-Seite erzwingt erneut `clamp` gegen Canvasbreite/-höhe, wodurch Werte > Canvas sofort zurückgesetzt werden.【F:layout-editor/src/state/layout-editor-store.ts†L391-L410】
4. **Interaction-Abschluss** – Nach Loslassen des Pointers wird ein finaler Container-Layout-Run ausgelöst, bevor History & Export geschrieben werden (`pushHistorySnapshot`, `flushExport`).【F:layout-editor/src/ui/components/stage.ts†L270-L357】 Dadurch landen alle Korrekturen synchronisiert in Persistenz und Vorschau.

## Zusammenspiel mit LayoutEditorStore
- **Batched Dispatch per `runInteraction`** – Während einer aktiven Pointer-Bewegung unterdrückt der Store `emitState`, sammelt Änderungen und verschiebt Export-Snapshots, bis `interactionDepth` wieder `0` ist. So bleiben Zwischenstände reaktiv, aber Export bleibt gedrosselt.【F:layout-editor/src/state/layout-editor-store.ts†L128-L177】【F:layout-editor/src/state/layout-editor-store.ts†L592-L614】
- **Canvas-Klammern auf mehreren Ebenen** – Neben den Stage-Limits wiederholt der Store die Begrenzung bei `moveElement`, `resizeElement` und global in `clampElementsToCanvas`, das beispielsweise bei `setCanvasSize` oder Container-Layouts greift.【F:layout-editor/src/state/layout-editor-store.ts†L147-L158】【F:layout-editor/src/state/layout-editor-store.ts†L369-L410】【F:layout-editor/src/state/layout-editor-store.ts†L671-L688】
- **Container-Relayout-Kaskaden** – Jedes Drag/Resize, das ein Container-Element oder dessen Kind betrifft, löst `applyContainerLayout` aus. Während des Draggens passiert dies `silent`, wodurch zusätzliche `emitState`-Calls vermieden werden. Nach der Interaktion erfolgt ein vollständiger Relayout-Lauf inkl. Emission.【F:layout-editor/src/ui/components/stage.ts†L242-L357】【F:layout-editor/src/state/layout-editor-store.ts†L295-L367】
- **Persistenz & Export** – Stage ruft am Ende `pushHistorySnapshot` und `flushExport` auf, was den Store zwingt, History zu schreiben und den Export-Payload sofort zu veröffentlichen. Durch `skipExport: true` innerhalb des Interaktionsframes wird verhindert, dass Zwischenschnappschüsse den Export triggern.【F:layout-editor/src/ui/components/stage.ts†L233-L240】【F:layout-editor/src/ui/components/stage.ts†L270-L357】【F:layout-editor/src/state/layout-editor-store.ts†L584-L614】

## Container-Relayout-Verhalten
- `applyContainerLayout` interpoliert Kinder strikt in das Innenrechteck (`width - 2*padding` bzw. `height - 2*padding`) und verteilt sie zeilen- oder spaltenweise. Überschüssige Breite/Höhe wird abgeschnitten, Align-Optionen können zusätzliche Verschiebungen auslösen.【F:layout-editor/src/state/layout-editor-store.ts†L295-L367】
- Wenn `clampElementsToCanvas` nach einer Canvas-Änderung läuft, werden Container nachträglich `silent` neu gelayoutet. So können manuelle Verschiebungen sofort überschrieben werden, sobald ein globaler Clamp-Prozess greift.【F:layout-editor/src/state/layout-editor-store.ts†L671-L688】

## Hypothesen für das "festgenagelte" Top-Right-Verhalten
1. **Canvas-Clamping auf Stage + Store-Ebene** – Selbst wenn die Stage theoretisch weiterziehen dürfte, setzt der doppelte Clamp die Koordinaten sofort auf `canvasWidth - element.width`. Offene Frage: Gibt es Fälle, in denen Stage-`canvasWidth` gegenüber Store-State hinterherhinkt, sodass bereits bei minimalem Delta zurückgeschnappt wird?【F:layout-editor/src/ui/components/stage.ts†L256-L259】【F:layout-editor/src/state/layout-editor-store.ts†L369-L388】
2. **Container-Layouts überschreiben Benutzerinput** – Nach jedem Pointer-Frame werden Container (oder deren Eltern) still neu ausgerichtet. Wenn `applyContainerLayout` die Kinderbreite wieder auf `slotWidth` setzt, kann eine rechtsseitige Verschiebung direkt negiert werden. Zu prüfen: Welche Container-Typen lösen trotz Drag an einem Einzelkind einen vollständigen Layout-Reset aus?【F:layout-editor/src/ui/components/stage.ts†L242-L357】【F:layout-editor/src/state/layout-editor-store.ts†L295-L367】
3. **`clampElementsToCanvas` nach globalen Canvas-Änderungen** – `setCanvasSize` ruft sofort `clampElementsToCanvas` auf, das nicht nur Canvas-Grenzen enforced, sondern Container anschließend erneut layoutet. Hypothese: Inspector-Änderungen triggern dieses Clamp bei jedem Tick und zwingen daher rechte Kanten zurück. Zu verifizieren: Wird `setCanvasSize` während einer Drag-Interaktion (z. B. Live-Preview) erneut aufgerufen?【F:layout-editor/src/state/layout-editor-store.ts†L147-L158】【F:layout-editor/src/state/layout-editor-store.ts†L671-L688】
4. **Kamera-Recentering im View-Container** – Stage-Panning selbst beeinflusst Kamera nur bei Alt/Middle-Drag, aber die Preview-Komponente könnte `centerCamera` oder `fitCameraToViewport` erneut triggern. Frage: Gibt es cross-Komponenten-Effekte, bei denen ein Container-Relayout die Kamera verschiebt und damit den Eindruck eines rechten Anschlags erzeugt? (Weiterführende Analyse in `view-preview-analysis.md` vorgesehen.)【F:layout-editor/src/ui/components/stage.ts†L119-L190】【F:layout-editor/src/ui/components/stage.ts†L405-L440】

## Offene Validierungsfragen
- Wie oft und in welchen Szenarien feuert `setCanvasSize` während aktiver Pointer-Interaktionen? Logging/Instrumentation nötig, um Live-Clamping nachzuweisen.
- Gibt es Container-Layouts, deren `align`-Einstellungen die horizontale Verschiebung einzelner Kinder erlauben, oder ist jeglicher Drag bei Kindern grundsätzlich chancenlos? Hier fehlt ein Matrix-Test über alle Container-Typen.
- Sind Export-Listener oder nachgelagerte Tools (`flushExport`) verantwortlich für ein externes Reset (z. B. Server-ACK, das den State neu lädt)? Eventuelle Race-Conditions zwischen Export und lokalem Snapshot müssen untersucht werden.

---
### Navigation
- ← [Task-Index](./README.md)
- ↗️ [StageComponent (Stage-Interaktionen)](../layout-editor/src/ui/components/stage.ts)
- ↗️ [LayoutEditorStore (State & Container-Layouts)](../layout-editor/src/state/layout-editor-store.ts)
