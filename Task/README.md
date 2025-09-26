# Bug Analysis Index: "rechter Rand festgenagelt"

## Zweck & Einordnung
Dieser Ordner sammelt alle Untersuchungen rund um den Fehler, bei dem die rechte Kante der Layout-Bühne bzw. Vorschau scheinbar "festgenagelt" bleibt und nicht frei verschoben werden kann. Er dient als Einstiegspunkt für tiefergehende Analysen zu Stage-Interaktionen, Vorschau-Rendering und Persistenzverhalten.

## Inhalt & Struktur
- `README.md` (dieses Dokument) – Überblick über Symptom, Reproduktion, betroffene Module und geplante Analysen.
- (reserviert) `ui-stage-analysis.md` – Detaillierte Auswertung der Pointer- und Kamera-Logik der Stage.
- (reserviert) `view-preview-analysis.md` – Untersuchung der View-Container-Vorschau, inklusive Kamera-Fit.
- (reserviert) `persistence-analysis.md` – Bewertung der Export-/Persistenzpfade für Canvas-Geometrien.

> Weitere Dateien werden bei Bedarf ergänzt und hier verlinkt. Jede neue Analyse muss die etablierten Dokumentationsstandards einhalten (Dateiliste, Zweckbeschreibung, Verweise auf Detaildocs).

## Symptomzusammenfassung
- **Beobachtung:** Nutzer berichten, dass beim Pannen oder Resizen die rechte Layout-Kante sofort an die Stage-Grenze zurückspringt; Elemente lassen sich nicht dauerhaft über den rechten Rand hinaus positionieren.
- **Vermutete Ursache:** Sowohl Stage-Interaktionen als auch die Vorschau fixieren X-Offsets, sobald die Canvas-Breite unterschritten wird, wodurch das Layout unmittelbar zurück in den sichtbaren Bereich gezwungen wird.

## Reproduktionsschritte
1. Ein Layout mit einem breiten Element öffnen oder ein neues Element anlegen.
2. Die Canvas-Breite im Inspector reduzieren oder das Element per Drag nach rechts verschieben.
3. Beobachten, dass der Cursor zwar über den Rand hinaus bewegt werden kann, der Knoten jedoch sofort wieder auf die Stage-Breite (max. `canvasWidth - element.width`) gesetzt wird.
4. Optional: Einen `view-container` auswählen und im Preview mittig klicken; beim Versuch, die Vorschau mittig nach links zu schieben, springt die Kamera nach kurzer Zeit wieder, sobald `fitCameraToViewport()` erneut ausgelöst wird.

## Betroffene Module & Schnellnavigation
- [StageComponent (Stage-Interaktionen)](../layout-editor/src/ui/components/stage.ts) – Pointer-Events begrenzen Dragging und Resizing hart auf `0…canvasWidth`, inklusive Container-Layouts und Export-Flushes.【F:layout-editor/src/ui/components/stage.ts†L58-L281】
- [View-Container Preview](../layout-editor/src/elements/components/view-container.ts) – Die Kamera passt sich bei jeder Resize- oder Wheel-Interaktion an und zentriert den Inhalt anhand der Viewport-Breite, was ein Festnageln an der rechten Kante provozieren kann.【F:layout-editor/src/elements/components/view-container.ts†L36-L210】
- [LayoutEditorStore (Persistenz)](../layout-editor/src/state/layout-editor-store.ts) – `setCanvasSize()` ruft `clampElementsToCanvas()` auf, wodurch Elementpositionen und -breiten auf die Canvas-Breite begrenzt werden; `serializeState()` konserviert diese Werte für Export/Reload.【F:layout-editor/src/state/layout-editor-store.ts†L152-L168】【F:layout-editor/src/state/layout-editor-store.ts†L481-L528】【F:layout-editor/src/state/layout-editor-store.ts†L671-L688】

## Geplante Deep-Dive-Sektionen
### Stage-Interaktionsanalyse (`ui-stage-analysis.md`)
Platzhalter für eine umfassende Untersuchung der Pointer- und Kamera-Logik (Drag, Resize, Fokus, Container-Sync). Ergänzen, sobald Ergebnisse vorliegen.

### View-Preview-Analyse (`view-preview-analysis.md`)
Reservierter Abschnitt für Erkenntnisse zu Kamera-Fit, Pointer-Capture und Scroll-Verhalten der Vorschau.

### Persistenz- & Exportanalyse (`persistence-analysis.md`)
Hier folgen Bewertungen zur Klammerung von `canvasWidth`, Export-Snapshots und History-Rollbacks.

## Weiterführende Navigation
- Zurück zur [Projektübersicht im Root](../README.md) für Vision, Setup und globale Richtlinien.
- [Docs-Verzeichnis](../docs/README.md) mit detaillierten Architektur- und API-Standards.
- Relevante Standards: [UI Performance Leitlinien](../docs/ui-performance.md) und [Datenmodell-Übersicht](../docs/data-model-overview.md) für Kontext bei Geometrie- und Persistenzfragen.
