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

## Ergebnisse: Container-Relayout-Matrix

Eine neue Testsuite deckt sämtliche Container-Typen (`box`, `vbox`, `hbox`) über alle Align-Varianten und zwei Stage-Viewport-Größen hinweg ab. Für jede Kombination wird ein Drag-Frame und ein Resize-Frame simuliert; dabei erfasst die Suite sowohl die durch den Interaktionsversuch gesetzten Offsets als auch die unmittelbar anschließenden Relayout-Ergebnisse. Die Assertions zeigen, dass `applyContainerLayout` jeden Versuch sofort auf die Baseline-Koordinaten und -Dimensionen zurücksetzt – sowohl während des `runInteraction`-Rahmens (silent) als auch nach dem finalen Commit.【F:layout-editor/tests/container-relayout.test.ts†L24-L127】【F:layout-editor/tests/helpers/container-fixtures.ts†L7-L212】

Die gemessenen Baselines und Versuchswerte sind in der folgenden Matrix zusammengefasst. In der Spalte „Drag Versuch“ ist der vom Test angeforderte Zieloffset dargestellt; die Spalte „Resize Versuch“ zeigt die Zielbreiten/-höhen. In allen Fällen fällt das tatsächliche Ergebnis nach dem Relayout wieder auf die Baseline (siehe Tests), womit der in der Hypothesenliste vermutete harte Reset bestätigt ist.【1b6aec†L1-L30】

| Stage | Container | Align | Baseline x/y | Drag Versuch x/y | Resize Versuch w/h |
|-------|-----------|-------|--------------|-------------------|--------------------|
| 640×480 | box-container | start | 156/146 | 204/182 | 332×140 |
| 640×480 | box-container | center | 190/146 | 238/182 | 332×140 |
| 640×480 | box-container | end | 224/146 | 272/182 | 332×140 |
| 640×480 | box-container | stretch | 156/146 | 204/182 | 400×140 |
| 640×480 | vbox-container | start | 166/126 | 214/162 | 332×160 |
| 640×480 | vbox-container | center | 190/126 | 238/162 | 332×160 |
| 640×480 | vbox-container | end | 214/126 | 262/162 | 332×160 |
| 640×480 | vbox-container | stretch | 166/126 | 214/162 | 380×160 |
| 640×480 | hbox-container | start | 156/146 | 204/182 | 228×214 |
| 640×480 | hbox-container | center | 156/160 | 204/196 | 228×214 |
| 640×480 | hbox-container | end | 156/174 | 204/210 | 228×214 |
| 640×480 | hbox-container | stretch | 156/146 | 204/182 | 228×242 |
| 1024×768 | box-container | start | 348/290 | 396/326 | 332×140 |
| 1024×768 | box-container | center | 382/290 | 430/326 | 332×140 |
| 1024×768 | box-container | end | 416/290 | 464/326 | 332×140 |
| 1024×768 | box-container | stretch | 348/290 | 396/326 | 400×140 |
| 1024×768 | vbox-container | start | 358/270 | 406/306 | 332×160 |
| 1024×768 | vbox-container | center | 382/270 | 430/306 | 332×160 |
| 1024×768 | vbox-container | end | 406/270 | 454/306 | 332×160 |
| 1024×768 | vbox-container | stretch | 358/270 | 406/306 | 380×160 |
| 1024×768 | hbox-container | start | 348/290 | 396/326 | 228×214 |
| 1024×768 | hbox-container | center | 348/304 | 396/340 | 228×214 |
| 1024×768 | hbox-container | end | 348/318 | 396/354 | 228×214 |
| 1024×768 | hbox-container | stretch | 348/290 | 396/326 | 228×242 |

---
### Navigation
- ← [Task-Index](./README.md)
- ↗️ [StageComponent (Stage-Interaktionen)](../layout-editor/src/ui/components/stage.ts)
- ↗️ [LayoutEditorStore (State & Container-Layouts)](../layout-editor/src/state/layout-editor-store.ts)
