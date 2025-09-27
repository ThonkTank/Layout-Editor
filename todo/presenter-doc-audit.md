# Presenter-Dokumentations-Audit

## Originalkritik
- Die Presenter-README beschreibt die Klassen nur grob und erwähnt nicht die neue Kameratelemetrie (`StageCameraObserver`) und den Fokus-Handshake zwischen Struktur-Panel und Stage-Controller.
- Die aktuelle Dokumentation führt nicht aus, wie Drag-and-Drop-Zustände über `setDraggedElement`, `assignElementToContainer` und `moveChildInContainer` synchronisiert werden, wodurch das Zusammenspiel zwischen Tree, Stage und Store unklar bleibt.
- Für die Fehlerpfade der Header-Controls fehlt eine Quelle, die die Normalisierung über `describeLayoutPersistenceError()` und die Spiegelung in Status-Banner sowie Obsidian-Notice erklärt.

## Kontext
- Audit basierend auf `layout-editor/src/presenters/structure-panel.ts`, `layout-editor/src/presenters/stage-controller.ts` und `layout-editor/src/presenters/header-controls.ts` gegen die README und UI-Dokumentation.
- Fokus auf orchestrierte Workflows: Kamera-Fokus-Telemetrie, Drag/Drop-Weiterleitung zum Store, Persistenz-Fehleraufbereitung.

## Betroffene Module
- `layout-editor/src/presenters/README.md`
- `layout-editor/src/presenters/structure-panel.ts`
- `layout-editor/src/presenters/stage-controller.ts`
- `layout-editor/src/presenters/header-controls.ts`
- `layout-editor/docs/ui-performance.md`

## Lösungsideen
- Presenter-README um Unterabschnitte erweitern, die den Fokus-Workflow (Tree → StageController → StageComponent) inklusive Telemetrie begründen und auf die Kamera-Instrumentierungsdoku verlinken.
- Drag-and-Drop-Kapitel ergänzen, das den Lebenszyklus von `setDraggedElement` über Reparent/Reorder-Aufrufe bis zu Stage-Overlays erläutert und Validierungsregeln dokumentiert.
- Fehlerpfade der Header-Controls dokumentieren: Mapping der Fehlercodes, Bannerdarstellung, Notice-Spiegelung und Auswirkungen auf weitere Komponenten (z. B. Export-Feld).
- Nachziehen der verlinkten Detaildokumente (UI-Performance, Stage-Instrumentierung), sodass sie die genannten Workflows im selben Detaillierungsgrad beschreiben.
